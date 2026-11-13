/*
 * addon.cpp — C++20 Node-API (N-API) Native Accelerator for Organic Trace
 *
 * Bridges:
 *   - C11 SHA-NI hardware-accelerated SHA-256, Base64 streaming & Merkle Tree engine (sha256_engine.c)
 *   - x86_64 Assembly vectorized SSSE3 hex encoding, SIMD pmaddwd dot-product, SIMD XMM pxor fold,
 *     constant-time compare & SSE4.2 CRC32C (fast_asm.S)
 *   - Native C++20 LRU + TTL off-heap response cache for sub-microsecond trace/batch lookups
 */

#include <node_api.h>
#include "sha256_engine.h"

#include <chrono>
#include <cstring>
#include <list>
#include <mutex>
#include <shared_mutex>
#include <string>
#include <unordered_map>
#include <vector>

namespace {

using Clock = std::chrono::steady_clock;
using TimePoint = Clock::time_point;

class OrganicNativeCache {
public:
    explicit OrganicNativeCache(size_t max_entries = 2048)
        : max_entries_(max_entries) {}

    bool get(const std::string& key, std::string& out_value) {
        std::unique_lock<std::shared_mutex> lock(mutex_);
        auto it = map_.find(key);
        if (it == map_.end()) {
            ++misses_;
            return false;
        }
        auto now = Clock::now();
        if (now >= it->second.second.expires_at) {
            lru_.erase(it->second.first);
            map_.erase(it);
            ++misses_;
            return false;
        }
        /* Move to front of LRU */
        lru_.splice(lru_.begin(), lru_, it->second.first);
        out_value = it->second.second.value;
        ++hits_;
        return true;
    }

    void set(const std::string& key, std::string value, int64_t ttl_ms) {
        std::unique_lock<std::shared_mutex> lock(mutex_);
        auto expires = Clock::now() + std::chrono::milliseconds(ttl_ms > 0 ? ttl_ms : 30000);
        auto it = map_.find(key);
        if (it != map_.end()) {
            it->second.second.value = std::move(value);
            it->second.second.expires_at = expires;
            lru_.splice(lru_.begin(), lru_, it->second.first);
            return;
        }
        if (map_.size() >= max_entries_ && !lru_.empty()) {
            const std::string& oldest = lru_.back();
            map_.erase(oldest);
            lru_.pop_back();
        }
        lru_.push_front(key);
        map_.emplace(key, std::make_pair(lru_.begin(), Entry{std::move(value), expires}));
    }

    size_t invalidate_prefix(const std::string& prefix) {
        std::unique_lock<std::shared_mutex> lock(mutex_);
        size_t removed = 0;
        for (auto it = map_.begin(); it != map_.end();) {
            if (it->first.compare(0, prefix.size(), prefix) == 0) {
                lru_.erase(it->second.first);
                it = map_.erase(it);
                ++removed;
            } else {
                ++it;
            }
        }
        return removed;
    }

    void clear() {
        std::unique_lock<std::shared_mutex> lock(mutex_);
        map_.clear();
        lru_.clear();
    }

    void stats(uint64_t& hits, uint64_t& misses, size_t& size, size_t& max_entries) {
        std::shared_lock<std::shared_mutex> lock(mutex_);
        hits = hits_;
        misses = misses_;
        size = map_.size();
        max_entries = max_entries_;
    }

private:
    struct Entry {
        std::string value;
        TimePoint expires_at;
    };

    size_t max_entries_;
    std::list<std::string> lru_;
    std::unordered_map<
        std::string,
        std::pair<std::list<std::string>::iterator, Entry>
    > map_;
    mutable std::shared_mutex mutex_;
    uint64_t hits_ = 0;
    uint64_t misses_ = 0;
};

static OrganicNativeCache g_cache(4096);

/* Helper to extract either Buffer or UTF-8 string bytes */
static bool extract_bytes(napi_env env, napi_value val, const uint8_t** data_ptr, size_t* len_ptr, std::string& temp_str) {
    bool is_buffer = false;
    napi_is_buffer(env, val, &is_buffer);
    if (is_buffer) {
        void* buf_data = nullptr;
        size_t buf_len = 0;
        if (napi_get_buffer_info(env, val, &buf_data, &buf_len) != napi_ok) {
            return false;
        }
        *data_ptr = static_cast<const uint8_t*>(buf_data);
        *len_ptr = buf_len;
        return true;
    }

    size_t str_len = 0;
    if (napi_get_value_string_utf8(env, val, nullptr, 0, &str_len) != napi_ok) {
        return false;
    }
    temp_str.resize(str_len);
    size_t copied = 0;
    napi_get_value_string_utf8(env, val, temp_str.data(), str_len + 1, &copied);
    *data_ptr = reinterpret_cast<const uint8_t*>(temp_str.data());
    *len_ptr = copied;
    return true;
}

static std::string extract_string(napi_env env, napi_value val) {
    napi_valuetype vt;
    if (napi_typeof(env, val, &vt) != napi_ok || vt != napi_string) {
        return "";
    }
    size_t len = 0;
    napi_get_value_string_utf8(env, val, nullptr, 0, &len);
    std::string s(len, '\0');
    size_t copied = 0;
    napi_get_value_string_utf8(env, val, s.data(), len + 1, &copied);
    return s;
}

/* sha256Hex(bufferOrString) -> "0x..." */
static napi_value NapiSha256Hex(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value argv[1];
    napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
    if (argc < 1) {
        napi_throw_type_error(env, nullptr, "sha256Hex requires 1 argument");
        return nullptr;
    }

    const uint8_t* ptr = nullptr;
    size_t len = 0;
    std::string temp;
    if (!extract_bytes(env, argv[0], &ptr, &len, temp)) {
        napi_throw_type_error(env, nullptr, "Expected Buffer or string");
        return nullptr;
    }

    char hex67[67];
    c_sha256_hex_0x(ptr, len, hex67);

    napi_value result;
    napi_create_string_utf8(env, hex67, 66, &result);
    return result;
}

/* sha256Base64Hex(base64String) -> "0x..." (zero-copy streaming Base64 -> SHA256) */
static napi_value NapiSha256Base64Hex(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value argv[1];
    napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
    if (argc < 1) {
        napi_throw_type_error(env, nullptr, "sha256Base64Hex requires 1 argument");
        return nullptr;
    }

    std::string b64 = extract_string(env, argv[0]);
    char hex67[67];
    c_sha256_base64_hex_0x(b64.data(), b64.size(), hex67);

    napi_value result;
    napi_create_string_utf8(env, hex67, 66, &result);
    return result;
}

/* constantTimeHashEquals(hashA, hashB) -> boolean (uses x86_64 asm_const_time_eq) */
static napi_value NapiConstantTimeHashEquals(napi_env env, napi_callback_info info) {
    size_t argc = 2;
    napi_value argv[2];
    napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
    if (argc < 2) {
        napi_value res;
        napi_get_boolean(env, false, &res);
        return res;
    }

    std::string a = extract_string(env, argv[0]);
    std::string b = extract_string(env, argv[1]);
    bool eq = false;
    if (!a.empty() && a.size() == b.size()) {
        eq = (asm_const_time_eq(a.data(), b.data(), a.size()) == 1);
    }

    napi_value res;
    napi_get_boolean(env, eq, &res);
    return res;
}

/* computeEventDataHash(batchId, eventType, participant, location, notes) -> "0x..." */
static napi_value NapiComputeEventDataHash(napi_env env, napi_callback_info info) {
    size_t argc = 5;
    napi_value argv[5];
    napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);

    std::string batchId     = argc > 0 ? extract_string(env, argv[0]) : "";
    std::string eventType   = argc > 1 ? extract_string(env, argv[1]) : "";
    std::string participant = argc > 2 ? extract_string(env, argv[2]) : "";
    std::string location    = argc > 3 ? extract_string(env, argv[3]) : "";
    std::string notes       = argc > 4 ? extract_string(env, argv[4]) : "";

    char hex67[67];
    c_compute_event_hash_0x(
        batchId.c_str(),
        eventType.c_str(),
        participant.c_str(),
        location.c_str(),
        notes.c_str(),
        hex67
    );

    napi_value result;
    napi_create_string_utf8(env, hex67, 66, &result);
    return result;
}

/* computeBatchMetadataHash(batchId, productName, cropType, farmLocation, harvestIso, quantityStr, unit) -> "0x..." */
static napi_value NapiComputeBatchMetadataHash(napi_env env, napi_callback_info info) {
    size_t argc = 7;
    napi_value argv[7];
    napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);

    std::string batchId      = argc > 0 ? extract_string(env, argv[0]) : "";
    std::string productName  = argc > 1 ? extract_string(env, argv[1]) : "";
    std::string cropType     = argc > 2 ? extract_string(env, argv[2]) : "";
    std::string farmLocation = argc > 3 ? extract_string(env, argv[3]) : "";
    std::string harvestIso   = argc > 4 ? extract_string(env, argv[4]) : "";
    std::string quantityStr  = argc > 5 ? extract_string(env, argv[5]) : "";
    std::string unit         = argc > 6 ? extract_string(env, argv[6]) : "";

    char hex67[67];
    c_compute_batch_hash_0x(
        batchId.c_str(),
        productName.c_str(),
        cropType.c_str(),
        farmLocation.c_str(),
        harvestIso.c_str(),
        quantityStr.c_str(),
        unit.c_str(),
        hex67
    );

    napi_value result;
    napi_create_string_utf8(env, hex67, 66, &result);
    return result;
}

/* computeMerkleRootHex(arrayOfHexStrings) -> "0x..." */
static napi_value NapiComputeMerkleRootHex(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value argv[1];
    napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);

    std::vector<std::string> owned;
    std::vector<const char*> ptrs;

    if (argc >= 1) {
        bool is_arr = false;
        napi_is_array(env, argv[0], &is_arr);
        if (is_arr) {
            uint32_t len = 0;
            napi_get_array_length(env, argv[0], &len);
            if (len > 65536) len = 65536;
            owned.reserve(len);
            ptrs.reserve(len);
            for (uint32_t i = 0; i < len; ++i) {
                napi_value elem;
                napi_get_element(env, argv[0], i, &elem);
                owned.push_back(extract_string(env, elem));
                ptrs.push_back(owned.back().c_str());
            }
        }
    }

    char hex67[67];
    c_compute_merkle_root_hex_0x(ptrs.empty() ? nullptr : ptrs.data(), ptrs.size(), hex67);

    napi_value result;
    napi_create_string_utf8(env, hex67, 66, &result);
    return result;
}

/* simdDotProductI16(vecA, vecB) -> int32 (uses x86_64 SIMD pmaddwd in fast_asm.S) */
static napi_value NapiSimdDotProductI16(napi_env env, napi_callback_info info) {
    size_t argc = 2;
    napi_value argv[2];
    napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);

    int32_t dot = 0;
    if (argc >= 2) {
        bool is_a = false, is_b = false;
        napi_is_array(env, argv[0], &is_a);
        napi_is_array(env, argv[1], &is_b);
        if (is_a && is_b) {
            uint32_t len_a = 0, len_b = 0;
            napi_get_array_length(env, argv[0], &len_a);
            napi_get_array_length(env, argv[1], &len_b);
            uint32_t n = len_a < len_b ? len_a : len_b;
            if (n > 1024) n = 1024;
            std::vector<int16_t> va(n), vb(n);
            for (uint32_t i = 0; i < n; ++i) {
                napi_value ea, eb;
                int32_t ia = 0, ib = 0;
                napi_get_element(env, argv[0], i, &ea);
                napi_get_element(env, argv[1], i, &eb);
                napi_get_value_int32(env, ea, &ia);
                napi_get_value_int32(env, eb, &ib);
                va[i] = static_cast<int16_t>(ia);
                vb[i] = static_cast<int16_t>(ib);
            }
            dot = asm_simd_dot_i16(va.data(), vb.data(), n);
        }
    }

    napi_value res;
    napi_create_int32(env, dot, &res);
    return res;
}

/* simdXorFold32Hex(hexA, hexB) -> "0x..." (uses 128-bit XMM SIMD pxor + SSSE3 pshufb hex) */
static napi_value NapiSimdXorFold32Hex(napi_env env, napi_callback_info info) {
    size_t argc = 2;
    napi_value argv[2];
    napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);

    std::string a = argc > 0 ? extract_string(env, argv[0]) : "";
    std::string b = argc > 1 ? extract_string(env, argv[1]) : "";

    uint8_t ba[32], bb[32], bout[32];
    if (c_hex_to_bytes32(a.c_str(), ba) != 0) {
        c_sha256_raw(reinterpret_cast<const uint8_t*>(a.data()), a.size(), ba);
    }
    if (c_hex_to_bytes32(b.c_str(), bb) != 0) {
        c_sha256_raw(reinterpret_cast<const uint8_t*>(b.data()), b.size(), bb);
    }

    asm_simd_xor32(ba, bb, bout);

    char hex67[67];
    asm_bytes32_to_hex_0x(bout, hex67);

    napi_value result;
    napi_create_string_utf8(env, hex67, 66, &result);
    return result;
}

/* runNativeBenchmark() -> live telemetry object */
static napi_value NapiRunNativeBenchmark(napi_env env, napi_callback_info info) {
    /* 1. SHA-256 + SSSE3 Hex + SSE4.2 CRC32C throughput on 256KB buffer x 40 iterations (10 MB) */
    std::vector<uint8_t> payload(256 * 1024, 0x61);
    char hex67[67];
    uint32_t crc = 0;

    auto t0 = Clock::now();
    const int sha_iters = 40;
    for (int i = 0; i < sha_iters; ++i) {
        c_sha256_hex_0x(payload.data(), payload.size(), hex67);
        crc ^= asm_crc32c_buffer(crc, payload.data(), payload.size());
    }
    auto t1 = Clock::now();
    double sha_ms = std::chrono::duration<double, std::milli>(t1 - t0).count();
    double sha_mb_s = (sha_iters * 0.25) / (sha_ms / 1000.0);

    /* 2. x86_64 SIMD pmaddwd 16-bit dot product benchmark (64-dim vector x 50,000 iterations) */
    alignas(16) int16_t vec_a[64];
    alignas(16) int16_t vec_b[64];
    for (int i = 0; i < 64; ++i) {
        vec_a[i] = static_cast<int16_t>((i * 7) + 3);
        vec_b[i] = static_cast<int16_t>((i * 5) - 11);
    }

    auto t2 = Clock::now();
    const int simd_iters = 50000;
    int32_t acc_dot = 0;
    for (int i = 0; i < simd_iters; ++i) {
        acc_dot ^= asm_simd_dot_i16(vec_a, vec_b, 64);
    }
    auto t3 = Clock::now();
    double simd_ms = std::chrono::duration<double, std::milli>(t3 - t2).count();
    double simd_mops_s = ((double)simd_iters * 64.0 / 1e6) / (simd_ms / 1000.0);

    /* 3. C11 + SHA-NI Merkle Root computation (16 leaves x 2,000 iterations) */
    const char* sample_leaves[16];
    for (int i = 0; i < 16; ++i) sample_leaves[i] = hex67;
    char merkle_hex[67];
    auto t4 = Clock::now();
    const int merkle_iters = 2000;
    for (int i = 0; i < merkle_iters; ++i) {
        c_compute_merkle_root_hex_0x(sample_leaves, 16, merkle_hex);
    }
    auto t5 = Clock::now();
    double merkle_us = (std::chrono::duration<double, std::micro>(t5 - t4).count()) / merkle_iters;

    napi_value obj, v_sha_mb, v_sha_ms, v_simd_mops, v_merkle_us, v_crc, v_dot, v_merkle_root, v_shani;
    napi_create_object(env, &obj);
    napi_create_double(env, sha_mb_s, &v_sha_mb);
    napi_create_double(env, sha_ms, &v_sha_ms);
    napi_create_double(env, simd_mops_s, &v_simd_mops);
    napi_create_double(env, merkle_us, &v_merkle_us);
    napi_create_uint32(env, crc, &v_crc);
    napi_create_int32(env, acc_dot, &v_dot);
    napi_create_string_utf8(env, merkle_hex, 66, &v_merkle_root);
    napi_get_boolean(env, c_has_sha_ni() == 1, &v_shani);

    napi_set_named_property(env, obj, "sha256ThroughputMBps", v_sha_mb);
    napi_set_named_property(env, obj, "sha256ElapsedMs", v_sha_ms);
    napi_set_named_property(env, obj, "simdDotThroughputMOps", v_simd_mops);
    napi_set_named_property(env, obj, "merkleRoot16LeavesUs", v_merkle_us);
    napi_set_named_property(env, obj, "sampleCrc32c", v_crc);
    napi_set_named_property(env, obj, "sampleSimdDot", v_dot);
    napi_set_named_property(env, obj, "sampleMerkleRoot", v_merkle_root);
    napi_set_named_property(env, obj, "shaNiHardware", v_shani);

    return obj;
}

/* crc32c(bufferOrString) -> uint32 (uses x86_64 SSE4.2 crc32q assembly) */
static napi_value NapiCrc32c(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value argv[1];
    napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
    if (argc < 1) {
        napi_value zero;
        napi_create_uint32(env, 0, &zero);
        return zero;
    }

    const uint8_t* ptr = nullptr;
    size_t len = 0;
    std::string temp;
    if (!extract_bytes(env, argv[0], &ptr, &len, temp)) {
        napi_value zero;
        napi_create_uint32(env, 0, &zero);
        return zero;
    }

    uint32_t crc = asm_crc32c_buffer(0, ptr, len);
    napi_value result;
    napi_create_uint32(env, crc, &result);
    return result;
}

/* cacheGet(key) -> string | null */
static napi_value NapiCacheGet(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value argv[1];
    napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
    if (argc < 1) {
        napi_value null_val;
        napi_get_null(env, &null_val);
        return null_val;
    }

    std::string key = extract_string(env, argv[0]);
    std::string val;
    if (g_cache.get(key, val)) {
        napi_value res;
        napi_create_string_utf8(env, val.data(), val.size(), &res);
        return res;
    }

    napi_value null_val;
    napi_get_null(env, &null_val);
    return null_val;
}

/* cacheSet(key, value, ttlMs = 30000) -> void */
static napi_value NapiCacheSet(napi_env env, napi_callback_info info) {
    size_t argc = 3;
    napi_value argv[3];
    napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
    if (argc >= 2) {
        std::string key = extract_string(env, argv[0]);
        std::string val = extract_string(env, argv[1]);
        int64_t ttl = 30000;
        if (argc >= 3) {
            napi_get_value_int64(env, argv[2], &ttl);
        }
        g_cache.set(key, std::move(val), ttl);
    }
    napi_value undef;
    napi_get_undefined(env, &undef);
    return undef;
}

/* cacheInvalidatePrefix(prefix) -> number removed */
static napi_value NapiCacheInvalidatePrefix(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value argv[1];
    napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
    size_t removed = 0;
    if (argc >= 1) {
        std::string prefix = extract_string(env, argv[0]);
        removed = g_cache.invalidate_prefix(prefix);
    }
    napi_value res;
    napi_create_uint32(env, static_cast<uint32_t>(removed), &res);
    return res;
}

/* cacheClear() -> void */
static napi_value NapiCacheClear(napi_env env, napi_callback_info info) {
    g_cache.clear();
    napi_value undef;
    napi_get_undefined(env, &undef);
    return undef;
}

/* getNativeStatus() -> object */
static napi_value NapiGetNativeStatus(napi_env env, napi_callback_info info) {
    napi_value obj;
    napi_create_object(env, &obj);

    napi_value v_loaded, v_arch, v_shani, v_asm_hex, v_asm_crc, v_asm_simd_dot, v_asm_simd_xor, v_merkle, v_hits, v_misses, v_size;
    napi_get_boolean(env, true, &v_loaded);
#if defined(__x86_64__) || defined(_M_X64)
    napi_create_string_utf8(env, "x86_64 (C11 + C++20 + GAS x86_64 SIMD ASM)", NAPI_AUTO_LENGTH, &v_arch);
#elif defined(__aarch64__) || defined(_M_ARM64)
    napi_create_string_utf8(env, "arm64 (C11 + C++20 Portable Native Engine)", NAPI_AUTO_LENGTH, &v_arch);
#else
    napi_create_string_utf8(env, "native (C11 + C++20 Portable Native Engine)", NAPI_AUTO_LENGTH, &v_arch);
#endif
    napi_get_boolean(env, c_has_sha_ni() == 1, &v_shani);
    napi_get_boolean(env, true, &v_asm_hex);
    napi_get_boolean(env, true, &v_asm_crc);
    napi_get_boolean(env, true, &v_asm_simd_dot);
    napi_get_boolean(env, true, &v_asm_simd_xor);
    napi_get_boolean(env, true, &v_merkle);

    uint64_t hits = 0, misses = 0;
    size_t size = 0, max_entries = 0;
    g_cache.stats(hits, misses, size, max_entries);

    napi_create_int64(env, static_cast<int64_t>(hits), &v_hits);
    napi_create_int64(env, static_cast<int64_t>(misses), &v_misses);
    napi_create_uint32(env, static_cast<uint32_t>(size), &v_size);

    napi_set_named_property(env, obj, "loaded", v_loaded);
    napi_set_named_property(env, obj, "engine", v_arch);
    napi_set_named_property(env, obj, "shaNiHardware", v_shani);
    napi_set_named_property(env, obj, "ssse3HexAsm", v_asm_hex);
    napi_set_named_property(env, obj, "sse42Crc32cAsm", v_asm_crc);
    napi_set_named_property(env, obj, "simdDotProductAsm", v_asm_simd_dot);
    napi_set_named_property(env, obj, "simdXorFoldAsm", v_asm_simd_xor);
    napi_set_named_property(env, obj, "c11MerkleTreeEngine", v_merkle);
    napi_set_named_property(env, obj, "cacheHits", v_hits);
    napi_set_named_property(env, obj, "cacheMisses", v_misses);
    napi_set_named_property(env, obj, "cacheEntries", v_size);

    return obj;
}

static napi_value Init(napi_env env, napi_value exports) {
    napi_property_descriptor desc[] = {
        {"sha256Hex", nullptr, NapiSha256Hex, nullptr, nullptr, nullptr, napi_default, nullptr},
        {"sha256Base64Hex", nullptr, NapiSha256Base64Hex, nullptr, nullptr, nullptr, napi_default, nullptr},
        {"constantTimeHashEquals", nullptr, NapiConstantTimeHashEquals, nullptr, nullptr, nullptr, napi_default, nullptr},
        {"computeEventDataHash", nullptr, NapiComputeEventDataHash, nullptr, nullptr, nullptr, napi_default, nullptr},
        {"computeBatchMetadataHash", nullptr, NapiComputeBatchMetadataHash, nullptr, nullptr, nullptr, napi_default, nullptr},
        {"computeMerkleRootHex", nullptr, NapiComputeMerkleRootHex, nullptr, nullptr, nullptr, napi_default, nullptr},
        {"simdDotProductI16", nullptr, NapiSimdDotProductI16, nullptr, nullptr, nullptr, napi_default, nullptr},
        {"simdXorFold32Hex", nullptr, NapiSimdXorFold32Hex, nullptr, nullptr, nullptr, napi_default, nullptr},
        {"runNativeBenchmark", nullptr, NapiRunNativeBenchmark, nullptr, nullptr, nullptr, napi_default, nullptr},
        {"crc32c", nullptr, NapiCrc32c, nullptr, nullptr, nullptr, napi_default, nullptr},
        {"cacheGet", nullptr, NapiCacheGet, nullptr, nullptr, nullptr, napi_default, nullptr},
        {"cacheSet", nullptr, NapiCacheSet, nullptr, nullptr, nullptr, napi_default, nullptr},
        {"cacheInvalidatePrefix", nullptr, NapiCacheInvalidatePrefix, nullptr, nullptr, nullptr, napi_default, nullptr},
        {"cacheClear", nullptr, NapiCacheClear, nullptr, nullptr, nullptr, napi_default, nullptr},
        {"getNativeStatus", nullptr, NapiGetNativeStatus, nullptr, nullptr, nullptr, napi_default, nullptr},
    };
    napi_define_properties(env, exports, sizeof(desc) / sizeof(desc[0]), desc);
    return exports;
}

} // namespace

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)

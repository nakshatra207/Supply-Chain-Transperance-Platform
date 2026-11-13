/*
 * sha256_engine.c — High-speed C11 SHA-256 + Base64 Streaming Engine
 *
 * Uses Intel/AMD SHA-NI hardware instructions when supported by the CPU
 * (detected at runtime via __builtin_cpu_supports("sha")), with a fast
 * unrolled scalar C fallback.
 * Also streams Base64 decoding directly into 4KB stack chunks so 5MB
 * certificate uploads never allocate intermediate decoded buffers on the heap.
 */

#include "sha256_engine.h"
#include <stdlib.h>
#include <string.h>

#if defined(__x86_64__) || defined(_M_X64)
#include <immintrin.h>
#else
/*
 * Portable C11 fallback implementations for non-x86_64 architectures
 * (e.g. ARM64 / Apple Silicon / Linux aarch64 / FreeBSD arm64).
 */
void asm_bytes32_to_hex_0x(const uint8_t* src32, char* dst67) {
    static const char HEX_LUT[16] = {
        '0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'
    };
    dst67[0] = '0';
    dst67[1] = 'x';
    for (size_t i = 0; i < 32; ++i) {
        uint8_t b = src32[i];
        dst67[2 + i * 2]     = HEX_LUT[(b >> 4) & 0x0F];
        dst67[2 + i * 2 + 1] = HEX_LUT[b & 0x0F];
    }
    dst67[66] = '\0';
}

int asm_const_time_eq(const char* a, const char* b, size_t len) {
    volatile uint8_t diff = 0;
    for (size_t i = 0; i < len; ++i) {
        diff |= (uint8_t)(a[i] ^ b[i]);
    }
    return diff == 0 ? 1 : 0;
}

uint32_t asm_crc32c_buffer(uint32_t crc, const uint8_t* buf, size_t len) {
    uint32_t c = ~crc;
    for (size_t i = 0; i < len; ++i) {
        c ^= buf[i];
        for (int bit = 0; bit < 8; ++bit) {
            c = (c >> 1) ^ (0x82F63B78U & (0U - (c & 1U)));
        }
    }
    return ~c;
}

void asm_simd_xor32(const uint8_t* a32, const uint8_t* b32, uint8_t* out32) {
    for (size_t i = 0; i < 32; ++i) {
        out32[i] = (uint8_t)(a32[i] ^ b32[i]);
    }
}

int32_t asm_simd_dot_i16(const int16_t* a, const int16_t* b, size_t count) {
    int32_t sum = 0;
    for (size_t i = 0; i < count; ++i) {
        sum += (int32_t)a[i] * (int32_t)b[i];
    }
    return sum;
}
#endif

typedef struct {
    uint32_t state[8];
    uint64_t bitcount;
    uint8_t buffer[64];
    size_t buffer_len;
    int use_sha_ni;
} sha256_ctx_t;

static const uint32_t K256[64] = {
    0x428a2f98UL, 0x71374491UL, 0xb5c0fbcfUL, 0xe9b5dba5UL,
    0x3956c25bUL, 0x59f111f1UL, 0x923f82a4UL, 0xab1c5ed5UL,
    0xd807aa98UL, 0x12835b01UL, 0x243185beUL, 0x550c7dc3UL,
    0x72be5d74UL, 0x80deb1feUL, 0x9bdc06a7UL, 0xc19bf174UL,
    0xe49b69c1UL, 0xefbe4786UL, 0x0fc19dc6UL, 0x240ca1ccUL,
    0x2de92c6fUL, 0x4a7484aaUL, 0x5cb0a9dcUL, 0x76f988daUL,
    0x983e5152UL, 0xa831c66dUL, 0xb00327c8UL, 0xbf597fc7UL,
    0xc6e00bf3UL, 0xd5a79147UL, 0x06ca6351UL, 0x14292967UL,
    0x27b70a85UL, 0x2e1b2138UL, 0x4d2c6dfcUL, 0x53380d13UL,
    0x650a7354UL, 0x766a0abbUL, 0x81c2c92eUL, 0x92722c85UL,
    0xa2bfe8a1UL, 0xa81a664bUL, 0xc24b8b70UL, 0xc76c51a3UL,
    0xd192e819UL, 0xd6990624UL, 0xf40e3585UL, 0x106aa070UL,
    0x19a4c116UL, 0x1e376c08UL, 0x2748774cUL, 0x34b0bcb5UL,
    0x391c0cb3UL, 0x4ed8aa4aUL, 0x5b9cca4fUL, 0x682e6ff3UL,
    0x748f82eeUL, 0x78a5636fUL, 0x84c87814UL, 0x8cc70208UL,
    0x90befffaUL, 0xa4506cebUL, 0xbef9a3f7UL, 0xc67178f2UL
};

#define ROR32(x, n) (((x) >> (n)) | ((x) << (32 - (n))))
#define CH(x, y, z) (((x) & (y)) ^ (~(x) & (z)))
#define MAJ(x, y, z) (((x) & (y)) ^ ((x) & (z)) ^ ((y) & (z)))
#define EP0(x) (ROR32(x, 2) ^ ROR32(x, 13) ^ ROR32(x, 22))
#define EP1(x) (ROR32(x, 6) ^ ROR32(x, 11) ^ ROR32(x, 25))
#define SIG0(x) (ROR32(x, 7) ^ ROR32(x, 18) ^ ((x) >> 3))
#define SIG1(x) (ROR32(x, 17) ^ ROR32(x, 19) ^ ((x) >> 10))

static void sha256_transform_scalar(uint32_t state[8], const uint8_t data[64], size_t num_blocks) {
    for (size_t blk = 0; blk < num_blocks; ++blk) {
        const uint8_t* ptr = data + (blk * 64);
        uint32_t m[64];
        for (int i = 0; i < 16; ++i) {
            m[i] = ((uint32_t)ptr[i * 4] << 24) |
                   ((uint32_t)ptr[i * 4 + 1] << 16) |
                   ((uint32_t)ptr[i * 4 + 2] << 8) |
                   ((uint32_t)ptr[i * 4 + 3]);
        }
        for (int i = 16; i < 64; ++i) {
            m[i] = SIG1(m[i - 2]) + m[i - 7] + SIG0(m[i - 15]) + m[i - 16];
        }

        uint32_t a = state[0], b = state[1], c = state[2], d = state[3];
        uint32_t e = state[4], f = state[5], g = state[6], h = state[7];

        for (int i = 0; i < 64; ++i) {
            uint32_t t1 = h + EP1(e) + CH(e, f, g) + K256[i] + m[i];
            uint32_t t2 = EP0(a) + MAJ(a, b, c);
            h = g; g = f; f = e; e = d + t1;
            d = c; c = b; b = a; a = t1 + t2;
        }

        state[0] += a; state[1] += b; state[2] += c; state[3] += d;
        state[4] += e; state[5] += f; state[6] += g; state[7] += h;
    }
}

#if defined(__x86_64__) || defined(_M_X64)
__attribute__((target("sha,sse4.1,ssse3")))
static void sha256_transform_shani(uint32_t state[8], const uint8_t* data, size_t num_blocks) {
    __m128i STATE0, STATE1;
    __m128i MSG, TMP;
    __m128i MSG0, MSG1, MSG2, MSG3;
    __m128i ABEF_SAVE, CDGH_SAVE;
    const __m128i MASK = _mm_set_epi64x(0x0c0d0e0f08090a0bULL, 0x0405060700010203ULL);

    TMP = _mm_loadu_si128((const __m128i*)&state[0]);
    STATE1 = _mm_loadu_si128((const __m128i*)&state[4]);

    TMP = _mm_shuffle_epi32(TMP, 0xB1);          /* CDAB */
    STATE1 = _mm_shuffle_epi32(STATE1, 0x1B);    /* EFGH */
    STATE0 = _mm_alignr_epi8(TMP, STATE1, 8);    /* ABEF */
    STATE1 = _mm_blend_epi16(STATE1, TMP, 0xF0); /* CDGH */

    for (size_t blk = 0; blk < num_blocks; ++blk) {
        const uint8_t* ptr = data + (blk * 64);
        ABEF_SAVE = STATE0;
        CDGH_SAVE = STATE1;

        /* Rounds 0-3 */
        MSG = _mm_loadu_si128((const __m128i*)(ptr + 0));
        MSG0 = _mm_shuffle_epi8(MSG, MASK);
        MSG = _mm_add_epi32(MSG0, _mm_set_epi64x(0xE9B5DBA5B5C0FBCFULL, 0x71374491428A2F98ULL));
        STATE1 = _mm_sha256rnds2_epu32(STATE1, STATE0, MSG);
        MSG = _mm_shuffle_epi32(MSG, 0x0E);
        STATE0 = _mm_sha256rnds2_epu32(STATE0, STATE1, MSG);

        /* Rounds 4-7 */
        MSG1 = _mm_loadu_si128((const __m128i*)(ptr + 16));
        MSG1 = _mm_shuffle_epi8(MSG1, MASK);
        MSG = _mm_add_epi32(MSG1, _mm_set_epi64x(0xAB1C5ED5923F82A4ULL, 0x59F111F13956C25BULL));
        STATE1 = _mm_sha256rnds2_epu32(STATE1, STATE0, MSG);
        MSG = _mm_shuffle_epi32(MSG, 0x0E);
        STATE0 = _mm_sha256rnds2_epu32(STATE0, STATE1, MSG);
        MSG0 = _mm_sha256msg1_epu32(MSG0, MSG1);

        /* Rounds 8-11 */
        MSG2 = _mm_loadu_si128((const __m128i*)(ptr + 32));
        MSG2 = _mm_shuffle_epi8(MSG2, MASK);
        MSG = _mm_add_epi32(MSG2, _mm_set_epi64x(0x550C7DC3243185BEULL, 0x12835B01D807AA98ULL));
        STATE1 = _mm_sha256rnds2_epu32(STATE1, STATE0, MSG);
        MSG = _mm_shuffle_epi32(MSG, 0x0E);
        STATE0 = _mm_sha256rnds2_epu32(STATE0, STATE1, MSG);
        MSG1 = _mm_sha256msg1_epu32(MSG1, MSG2);

        /* Rounds 12-15 */
        MSG3 = _mm_loadu_si128((const __m128i*)(ptr + 48));
        MSG3 = _mm_shuffle_epi8(MSG3, MASK);
        MSG = _mm_add_epi32(MSG3, _mm_set_epi64x(0xC19BF1749BDC06A7ULL, 0x80DEB1FE72BE5D74ULL));
        STATE1 = _mm_sha256rnds2_epu32(STATE1, STATE0, MSG);
        TMP = _mm_alignr_epi8(MSG3, MSG2, 4);
        MSG0 = _mm_add_epi32(MSG0, TMP);
        MSG0 = _mm_sha256msg2_epu32(MSG0, MSG3);
        MSG = _mm_shuffle_epi32(MSG, 0x0E);
        STATE0 = _mm_sha256rnds2_epu32(STATE0, STATE1, MSG);
        MSG2 = _mm_sha256msg1_epu32(MSG2, MSG3);

        /* Rounds 16-19 */
        MSG = _mm_add_epi32(MSG0, _mm_set_epi64x(0x240CA1CC0FC19DC6ULL, 0xEFBE4786E49B69C1ULL));
        STATE1 = _mm_sha256rnds2_epu32(STATE1, STATE0, MSG);
        TMP = _mm_alignr_epi8(MSG0, MSG3, 4);
        MSG1 = _mm_add_epi32(MSG1, TMP);
        MSG1 = _mm_sha256msg2_epu32(MSG1, MSG0);
        MSG = _mm_shuffle_epi32(MSG, 0x0E);
        STATE0 = _mm_sha256rnds2_epu32(STATE0, STATE1, MSG);
        MSG3 = _mm_sha256msg1_epu32(MSG3, MSG0);

        /* Rounds 20-23 */
        MSG = _mm_add_epi32(MSG1, _mm_set_epi64x(0x76F988DA5CB0A9DCULL, 0x4A7484AA2DE92C6FULL));
        STATE1 = _mm_sha256rnds2_epu32(STATE1, STATE0, MSG);
        TMP = _mm_alignr_epi8(MSG1, MSG0, 4);
        MSG2 = _mm_add_epi32(MSG2, TMP);
        MSG2 = _mm_sha256msg2_epu32(MSG2, MSG1);
        MSG = _mm_shuffle_epi32(MSG, 0x0E);
        STATE0 = _mm_sha256rnds2_epu32(STATE0, STATE1, MSG);
        MSG0 = _mm_sha256msg1_epu32(MSG0, MSG1);

        /* Rounds 24-27 */
        MSG = _mm_add_epi32(MSG2, _mm_set_epi64x(0xBF597FC7B00327C8ULL, 0xA831C66D983E5152ULL));
        STATE1 = _mm_sha256rnds2_epu32(STATE1, STATE0, MSG);
        TMP = _mm_alignr_epi8(MSG2, MSG1, 4);
        MSG3 = _mm_add_epi32(MSG3, TMP);
        MSG3 = _mm_sha256msg2_epu32(MSG3, MSG2);
        MSG = _mm_shuffle_epi32(MSG, 0x0E);
        STATE0 = _mm_sha256rnds2_epu32(STATE0, STATE1, MSG);
        MSG1 = _mm_sha256msg1_epu32(MSG1, MSG2);

        /* Rounds 28-31 */
        MSG = _mm_add_epi32(MSG3, _mm_set_epi64x(0x1429296706CA6351ULL, 0xD5A79147C6E00BF3ULL));
        STATE1 = _mm_sha256rnds2_epu32(STATE1, STATE0, MSG);
        TMP = _mm_alignr_epi8(MSG3, MSG2, 4);
        MSG0 = _mm_add_epi32(MSG0, TMP);
        MSG0 = _mm_sha256msg2_epu32(MSG0, MSG3);
        MSG = _mm_shuffle_epi32(MSG, 0x0E);
        STATE0 = _mm_sha256rnds2_epu32(STATE0, STATE1, MSG);
        MSG2 = _mm_sha256msg1_epu32(MSG2, MSG3);

        /* Rounds 32-35 */
        MSG = _mm_add_epi32(MSG0, _mm_set_epi64x(0x53380D134D2C6DFCULL, 0x2E1B213827B70A85ULL));
        STATE1 = _mm_sha256rnds2_epu32(STATE1, STATE0, MSG);
        TMP = _mm_alignr_epi8(MSG0, MSG3, 4);
        MSG1 = _mm_add_epi32(MSG1, TMP);
        MSG1 = _mm_sha256msg2_epu32(MSG1, MSG0);
        MSG = _mm_shuffle_epi32(MSG, 0x0E);
        STATE0 = _mm_sha256rnds2_epu32(STATE0, STATE1, MSG);
        MSG3 = _mm_sha256msg1_epu32(MSG3, MSG0);

        /* Rounds 36-39 */
        MSG = _mm_add_epi32(MSG1, _mm_set_epi64x(0x92722C8581C2C92EULL, 0x766A0ABB650A7354ULL));
        STATE1 = _mm_sha256rnds2_epu32(STATE1, STATE0, MSG);
        TMP = _mm_alignr_epi8(MSG1, MSG0, 4);
        MSG2 = _mm_add_epi32(MSG2, TMP);
        MSG2 = _mm_sha256msg2_epu32(MSG2, MSG1);
        MSG = _mm_shuffle_epi32(MSG, 0x0E);
        STATE0 = _mm_sha256rnds2_epu32(STATE0, STATE1, MSG);
        MSG0 = _mm_sha256msg1_epu32(MSG0, MSG1);

        /* Rounds 40-43 */
        MSG = _mm_add_epi32(MSG2, _mm_set_epi64x(0xC76C51A3C24B8B70ULL, 0xA81A664BA2BFE8A1ULL));
        STATE1 = _mm_sha256rnds2_epu32(STATE1, STATE0, MSG);
        TMP = _mm_alignr_epi8(MSG2, MSG1, 4);
        MSG3 = _mm_add_epi32(MSG3, TMP);
        MSG3 = _mm_sha256msg2_epu32(MSG3, MSG2);
        MSG = _mm_shuffle_epi32(MSG, 0x0E);
        STATE0 = _mm_sha256rnds2_epu32(STATE0, STATE1, MSG);
        MSG1 = _mm_sha256msg1_epu32(MSG1, MSG2);

        /* Rounds 44-47 */
        MSG = _mm_add_epi32(MSG3, _mm_set_epi64x(0x106AA070F40E3585ULL, 0xD6990624D192E819ULL));
        STATE1 = _mm_sha256rnds2_epu32(STATE1, STATE0, MSG);
        TMP = _mm_alignr_epi8(MSG3, MSG2, 4);
        MSG0 = _mm_add_epi32(MSG0, TMP);
        MSG0 = _mm_sha256msg2_epu32(MSG0, MSG3);
        MSG = _mm_shuffle_epi32(MSG, 0x0E);
        STATE0 = _mm_sha256rnds2_epu32(STATE0, STATE1, MSG);
        MSG2 = _mm_sha256msg1_epu32(MSG2, MSG3);

        /* Rounds 48-51 */
        MSG = _mm_add_epi32(MSG0, _mm_set_epi64x(0x34B0BCB52748774CULL, 0x1E376C0819A4C116ULL));
        STATE1 = _mm_sha256rnds2_epu32(STATE1, STATE0, MSG);
        TMP = _mm_alignr_epi8(MSG0, MSG3, 4);
        MSG1 = _mm_add_epi32(MSG1, TMP);
        MSG1 = _mm_sha256msg2_epu32(MSG1, MSG0);
        MSG = _mm_shuffle_epi32(MSG, 0x0E);
        STATE0 = _mm_sha256rnds2_epu32(STATE0, STATE1, MSG);
        MSG3 = _mm_sha256msg1_epu32(MSG3, MSG0);

        /* Rounds 52-55 */
        MSG = _mm_add_epi32(MSG1, _mm_set_epi64x(0x682E6FF35B9CCA4FULL, 0x4ED8AA4A391C0CB3ULL));
        STATE1 = _mm_sha256rnds2_epu32(STATE1, STATE0, MSG);
        TMP = _mm_alignr_epi8(MSG1, MSG0, 4);
        MSG2 = _mm_add_epi32(MSG2, TMP);
        MSG2 = _mm_sha256msg2_epu32(MSG2, MSG1);
        MSG = _mm_shuffle_epi32(MSG, 0x0E);
        STATE0 = _mm_sha256rnds2_epu32(STATE0, STATE1, MSG);

        /* Rounds 56-59 */
        MSG = _mm_add_epi32(MSG2, _mm_set_epi64x(0x8CC7020884C87814ULL, 0x78A5636F748F82EEULL));
        STATE1 = _mm_sha256rnds2_epu32(STATE1, STATE0, MSG);
        TMP = _mm_alignr_epi8(MSG2, MSG1, 4);
        MSG3 = _mm_add_epi32(MSG3, TMP);
        MSG3 = _mm_sha256msg2_epu32(MSG3, MSG2);
        MSG = _mm_shuffle_epi32(MSG, 0x0E);
        STATE0 = _mm_sha256rnds2_epu32(STATE0, STATE1, MSG);

        /* Rounds 60-63 */
        MSG = _mm_add_epi32(MSG3, _mm_set_epi64x(0xC67178F2BEF9A3F7ULL, 0xA4506CEB90BEFFFAULL));
        STATE1 = _mm_sha256rnds2_epu32(STATE1, STATE0, MSG);
        MSG = _mm_shuffle_epi32(MSG, 0x0E);
        STATE0 = _mm_sha256rnds2_epu32(STATE0, STATE1, MSG);

        STATE0 = _mm_add_epi32(STATE0, ABEF_SAVE);
        STATE1 = _mm_add_epi32(STATE1, CDGH_SAVE);
    }

    TMP = _mm_shuffle_epi32(STATE0, 0x1B);       /* FEBA */
    STATE1 = _mm_shuffle_epi32(STATE1, 0xB1);    /* DCHG */
    STATE0 = _mm_blend_epi16(TMP, STATE1, 0xF0); /* DCBA */
    STATE1 = _mm_alignr_epi8(STATE1, TMP, 8);    /* HGFE */

    _mm_storeu_si128((__m128i*)&state[0], STATE0);
    _mm_storeu_si128((__m128i*)&state[4], STATE1);
}
#endif

int c_has_sha_ni(void) {
#if defined(__x86_64__) || defined(_M_X64)
    static int cached = -1;
    if (cached == -1) {
        __builtin_cpu_init();
        cached = __builtin_cpu_supports("sha") ? 1 : 0;
    }
    return cached;
#else
    return 0;
#endif
}

static void sha256_transform(sha256_ctx_t* ctx, const uint8_t* data, size_t num_blocks) {
#if defined(__x86_64__) || defined(_M_X64)
    if (ctx->use_sha_ni) {
        sha256_transform_shani(ctx->state, data, num_blocks);
        return;
    }
#endif
    sha256_transform_scalar(ctx->state, data, num_blocks);
}

static void sha256_init(sha256_ctx_t* ctx) {
    ctx->state[0] = 0x6a09e667UL;
    ctx->state[1] = 0xbb67ae85UL;
    ctx->state[2] = 0x3c6ef372UL;
    ctx->state[3] = 0xa54ff53aUL;
    ctx->state[4] = 0x510e527fUL;
    ctx->state[5] = 0x9b05688cUL;
    ctx->state[6] = 0x1f83d9abUL;
    ctx->state[7] = 0x5be0cd19UL;
    ctx->bitcount = 0;
    ctx->buffer_len = 0;
    ctx->use_sha_ni = c_has_sha_ni();
}

static void sha256_update(sha256_ctx_t* ctx, const uint8_t* data, size_t len) {
    if (len == 0) return;
    ctx->bitcount += (uint64_t)len * 8ULL;

    if (ctx->buffer_len > 0) {
        size_t take = 64 - ctx->buffer_len;
        if (take > len) take = len;
        memcpy(ctx->buffer + ctx->buffer_len, data, take);
        ctx->buffer_len += take;
        data += take;
        len -= take;
        if (ctx->buffer_len == 64) {
            sha256_transform(ctx, ctx->buffer, 1);
            ctx->buffer_len = 0;
        }
    }

    if (len >= 64) {
        size_t blocks = len / 64;
        sha256_transform(ctx, data, blocks);
        size_t consumed = blocks * 64;
        data += consumed;
        len -= consumed;
    }

    if (len > 0) {
        memcpy(ctx->buffer, data, len);
        ctx->buffer_len = len;
    }
}

static void sha256_final(sha256_ctx_t* ctx, uint8_t out32[32]) {
    size_t i = ctx->buffer_len;
    ctx->buffer[i++] = 0x80;

    if (i > 56) {
        memset(ctx->buffer + i, 0, 64 - i);
        sha256_transform(ctx, ctx->buffer, 1);
        i = 0;
    }
    memset(ctx->buffer + i, 0, 56 - i);

    uint64_t bits = ctx->bitcount;
    for (int j = 0; j < 8; ++j) {
        ctx->buffer[63 - j] = (uint8_t)(bits & 0xff);
        bits >>= 8;
    }
    sha256_transform(ctx, ctx->buffer, 1);

    for (int j = 0; j < 8; ++j) {
        out32[j * 4 + 0] = (uint8_t)((ctx->state[j] >> 24) & 0xff);
        out32[j * 4 + 1] = (uint8_t)((ctx->state[j] >> 16) & 0xff);
        out32[j * 4 + 2] = (uint8_t)((ctx->state[j] >> 8) & 0xff);
        out32[j * 4 + 3] = (uint8_t)(ctx->state[j] & 0xff);
    }
}

void c_sha256_raw(const uint8_t* data, size_t len, uint8_t out32[32]) {
    sha256_ctx_t ctx;
    sha256_init(&ctx);
    sha256_update(&ctx, data, len);
    sha256_final(&ctx, out32);
}

void c_sha256_hex_0x(const uint8_t* data, size_t len, char out_hex67[67]) {
    uint8_t digest[32];
    c_sha256_raw(data, len, digest);
    asm_bytes32_to_hex_0x(digest, out_hex67);
}

/* Fast 256-byte Base64 decoding lookup table:
 *   0..63 = valid sextet
 *   0xFE  = whitespace/padding skip
 *   0xFF  = invalid
 */
static const uint8_t B64_LUT[256] = {
    0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFE,0xFE,0xFF,0xFF,0xFE,0xFF,0xFF,
    0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,
    0xFE,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,  62,0xFF,  62,0xFF,  63,
      52,  53,  54,  55,  56,  57,  58,  59,  60,  61,0xFF,0xFF,0xFF,0xFE,0xFF,0xFF,
    0xFF,   0,   1,   2,   3,   4,   5,   6,   7,   8,   9,  10,  11,  12,  13,  14,
      15,  16,  17,  18,  19,  20,  21,  22,  23,  24,  25,0xFF,0xFF,0xFF,0xFF,  63,
    0xFF,  26,  27,  28,  29,  30,  31,  32,  33,  34,  35,  36,  37,  38,  39,  40,
      41,  42,  43,  44,  45,  46,  47,  48,  49,  50,  51,0xFF,0xFF,0xFF,0xFF,0xFF,
    0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,
    0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,
    0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,
    0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,
    0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,
    0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,
    0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,
    0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF
};

int c_sha256_base64_hex_0x(const char* b64, size_t b64_len, char out_hex67[67]) {
    sha256_ctx_t ctx;
    sha256_init(&ctx);

    /* Strip optional data URL prefix e.g. "data:...;base64," if present */
    for (size_t i = 0; i < b64_len && i < 128; ++i) {
        if (b64[i] == ',') {
            b64 += (i + 1);
            b64_len -= (i + 1);
            break;
        }
    }

    uint8_t chunk[4096];
    size_t chunk_len = 0;
    uint32_t acc = 0;
    int sextets = 0;

    for (size_t i = 0; i < b64_len; ++i) {
        uint8_t c = (uint8_t)b64[i];
        if (c == '=') break;
        uint8_t val = B64_LUT[c];
        if (val >= 0xFE) continue; /* skip whitespace or invalid chars just like Buffer.from(..., 'base64') */

        acc = (acc << 6) | val;
        sextets++;
        if (sextets == 4) {
            chunk[chunk_len++] = (uint8_t)((acc >> 16) & 0xFF);
            chunk[chunk_len++] = (uint8_t)((acc >> 8) & 0xFF);
            chunk[chunk_len++] = (uint8_t)(acc & 0xFF);
            sextets = 0;
            acc = 0;

            if (chunk_len >= sizeof(chunk) - 3) {
                sha256_update(&ctx, chunk, chunk_len);
                chunk_len = 0;
            }
        }
    }

    if (sextets == 2) {
        chunk[chunk_len++] = (uint8_t)((acc >> 4) & 0xFF);
    } else if (sextets == 3) {
        chunk[chunk_len++] = (uint8_t)((acc >> 10) & 0xFF);
        chunk[chunk_len++] = (uint8_t)((acc >> 2) & 0xFF);
    }

    if (chunk_len > 0) {
        sha256_update(&ctx, chunk, chunk_len);
    }

    uint8_t digest[32];
    sha256_final(&ctx, digest);
    asm_bytes32_to_hex_0x(digest, out_hex67);
    return 0;
}

void c_compute_event_hash_0x(
    const char* batchId,
    const char* eventType,
    const char* participant,
    const char* location,
    const char* notes,
    char out_hex67[67]
) {
    sha256_ctx_t ctx;
    sha256_init(&ctx);
    const uint8_t sep = '|';

    if (batchId) sha256_update(&ctx, (const uint8_t*)batchId, strlen(batchId));
    sha256_update(&ctx, &sep, 1);
    if (eventType) sha256_update(&ctx, (const uint8_t*)eventType, strlen(eventType));
    sha256_update(&ctx, &sep, 1);
    if (participant) sha256_update(&ctx, (const uint8_t*)participant, strlen(participant));
    sha256_update(&ctx, &sep, 1);
    if (location) sha256_update(&ctx, (const uint8_t*)location, strlen(location));
    sha256_update(&ctx, &sep, 1);
    if (notes) sha256_update(&ctx, (const uint8_t*)notes, strlen(notes));

    uint8_t digest[32];
    sha256_final(&ctx, digest);
    asm_bytes32_to_hex_0x(digest, out_hex67);
}

void c_compute_batch_hash_0x(
    const char* batchId,
    const char* productName,
    const char* cropType,
    const char* farmLocation,
    const char* harvestIso,
    const char* quantityStr,
    const char* unit,
    char out_hex67[67]
) {
    sha256_ctx_t ctx;
    sha256_init(&ctx);
    const uint8_t sep = '|';

    if (batchId) sha256_update(&ctx, (const uint8_t*)batchId, strlen(batchId));
    sha256_update(&ctx, &sep, 1);
    if (productName) sha256_update(&ctx, (const uint8_t*)productName, strlen(productName));
    sha256_update(&ctx, &sep, 1);
    if (cropType) sha256_update(&ctx, (const uint8_t*)cropType, strlen(cropType));
    sha256_update(&ctx, &sep, 1);
    if (farmLocation) sha256_update(&ctx, (const uint8_t*)farmLocation, strlen(farmLocation));
    sha256_update(&ctx, &sep, 1);
    if (harvestIso) sha256_update(&ctx, (const uint8_t*)harvestIso, strlen(harvestIso));
    sha256_update(&ctx, &sep, 1);
    if (quantityStr) sha256_update(&ctx, (const uint8_t*)quantityStr, strlen(quantityStr));
    sha256_update(&ctx, &sep, 1);
    if (unit) sha256_update(&ctx, (const uint8_t*)unit, strlen(unit));

    uint8_t digest[32];
    sha256_final(&ctx, digest);
    asm_bytes32_to_hex_0x(digest, out_hex67);
}

static inline int hex_nibble(char c) {
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    if (c >= 'A' && c <= 'F') return c - 'A' + 10;
    return -1;
}

int c_hex_to_bytes32(const char* hex_str, uint8_t out32[32]) {
    if (!hex_str) return -1;
    if (hex_str[0] == '0' && (hex_str[1] == 'x' || hex_str[1] == 'X')) {
        hex_str += 2;
    }
    for (int i = 0; i < 32; ++i) {
        int hi = hex_nibble(hex_str[i * 2]);
        int lo = hex_nibble(hex_str[i * 2 + 1]);
        if (hi < 0 || lo < 0) return -1;
        out32[i] = (uint8_t)((hi << 4) | lo);
    }
    return 0;
}

/*
 * Computes the binary SHA-256 Merkle Tree root of `count` leaf hashes in C11 + SHA-NI + SSSE3 Assembly.
 * Uses stack storage for up to 128 leaves (zero heap allocations) and dynamic heap allocation
 * for larger trees (> 128 leaves) so arbitrary batch/event histories are supported without truncation.
 */
void c_compute_merkle_root_hex_0x(
    const char* const* hex_hashes,
    size_t count,
    char out_hex67[67]
) {
    if (!hex_hashes || count == 0) {
        c_sha256_hex_0x((const uint8_t*)"", 0, out_hex67);
        return;
    }

    uint8_t stack_nodes[128][32];
    uint8_t (*nodes)[32] = stack_nodes;
    if (count > 128) {
        nodes = (uint8_t (*)[32])malloc(count * 32);
        if (!nodes) {
            c_sha256_hex_0x((const uint8_t*)"", 0, out_hex67);
            return;
        }
    }

    for (size_t i = 0; i < count; ++i) {
        const char* h = hex_hashes[i] ? hex_hashes[i] : "";
        if (c_hex_to_bytes32(h, nodes[i]) != 0) {
            c_sha256_raw((const uint8_t*)h, strlen(h), nodes[i]);
        }
    }

    if (count == 1) {
        asm_bytes32_to_hex_0x(nodes[0], out_hex67);
        if (nodes != stack_nodes) free(nodes);
        return;
    }

    size_t current_len = count;
    uint8_t pair_buf[64];

    while (current_len > 1) {
        size_t next_len = (current_len + 1) / 2;
        for (size_t i = 0; i < next_len; ++i) {
            size_t left_idx = i * 2;
            size_t right_idx = (left_idx + 1 < current_len) ? (left_idx + 1) : left_idx;
            memcpy(pair_buf, nodes[left_idx], 32);
            memcpy(pair_buf + 32, nodes[right_idx], 32);
            c_sha256_raw(pair_buf, 64, nodes[i]);
        }
        current_len = next_len;
    }

    asm_bytes32_to_hex_0x(nodes[0], out_hex67);
    if (nodes != stack_nodes) free(nodes);
}

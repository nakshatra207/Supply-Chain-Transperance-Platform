#ifndef ORGANIC_SHA256_ENGINE_H
#define ORGANIC_SHA256_ENGINE_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Assembly routines from fast_asm.S (SSSE3 / SSE4.2 / XMM SIMD) */
void asm_bytes32_to_hex_0x(const uint8_t* src32, char* dst67);
int asm_const_time_eq(const char* a, const char* b, size_t len);
uint32_t asm_crc32c_buffer(uint32_t crc, const uint8_t* buf, size_t len);
void asm_simd_xor32(const uint8_t* a32, const uint8_t* b32, uint8_t* out32);
int32_t asm_simd_dot_i16(const int16_t* a, const int16_t* b, size_t count);

/* C11 SHA-256 (with x86 SHA-NI hardware acceleration), Base64 streaming & Merkle Tree */
int c_has_sha_ni(void);
void c_sha256_raw(const uint8_t* data, size_t len, uint8_t out32[32]);
void c_sha256_hex_0x(const uint8_t* data, size_t len, char out_hex67[67]);
int c_sha256_base64_hex_0x(const char* b64, size_t b64_len, char out_hex67[67]);
void c_compute_event_hash_0x(
    const char* batchId,
    const char* eventType,
    const char* participant,
    const char* location,
    const char* notes,
    char out_hex67[67]
);
void c_compute_batch_hash_0x(
    const char* batchId,
    const char* productName,
    const char* cropType,
    const char* farmLocation,
    const char* harvestIso,
    const char* quantityStr,
    const char* unit,
    char out_hex67[67]
);
void c_compute_merkle_root_hex_0x(
    const char* const* hex_hashes,
    size_t count,
    char out_hex67[67]
);
int c_hex_to_bytes32(const char* hex_str, uint8_t out32[32]);

#ifdef __cplusplus
}
#endif

#endif /* ORGANIC_SHA256_ENGINE_H */

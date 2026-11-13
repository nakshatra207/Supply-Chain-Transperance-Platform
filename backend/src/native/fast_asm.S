/*
 * fast_asm.S — x86_64 Assembly routines for Organic Trace Native Engine
 *
 * Provides:
 *   1. asm_bytes32_to_hex_0x(const uint8_t* src32, char* dst67)
 *      - Vectorized SSSE3 (pshufb) 32-byte to "0x" + 64-byte lowercase hex string
 *   2. asm_const_time_eq(const char* a, const char* b, size_t len)
 *      - Branchless constant-time memory comparison for tamper-proof hash checks
 *   3. asm_crc32c_buffer(uint32_t crc, const uint8_t* buf, size_t len)
 *      - Hardware-accelerated SSE4.2 CRC32C (crc32q / crc32b) checksum
 */

#if defined(__x86_64__) || defined(_M_X64)

    .section .rodata
    .align 16
.Lmask_0f:
    .octa 0x0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f
.Lhex_lut:
    .ascii "0123456789abcdef"

    .text

/*
 * void asm_bytes32_to_hex_0x(const uint8_t* src32, char* dst67)
 * System V AMD64 ABI:
 *   %rdi = src32 (pointer to 32 bytes)
 *   %rsi = dst67 (pointer to at least 67 bytes: "0x" + 64 hex chars + '\0')
 */
    .globl asm_bytes32_to_hex_0x
    .type asm_bytes32_to_hex_0x, @function
    .align 16
asm_bytes32_to_hex_0x:
    /* Write "0x" prefix (0x7830 in little-endian) */
    movw    $0x7830, (%rsi)

    movdqa  .Lmask_0f(%rip), %xmm6
    movdqa  .Lhex_lut(%rip), %xmm7

    /* --- First 16 bytes (src32[0..15] -> dst67[2..33]) --- */
    movdqu  (%rdi), %xmm0
    movdqa  %xmm0, %xmm1
    psrlw   $4, %xmm1
    pand    %xmm6, %xmm1        /* high nibbles */
    pand    %xmm6, %xmm0        /* low nibbles */

    movdqa  %xmm1, %xmm2
    punpcklbw %xmm0, %xmm1      /* interleaved nibbles for bytes 0..7 */
    punpckhbw %xmm0, %xmm2      /* interleaved nibbles for bytes 8..15 */

    movdqa  %xmm7, %xmm3
    pshufb  %xmm1, %xmm3        /* ASCII hex for bytes 0..7 */
    movdqa  %xmm7, %xmm4
    pshufb  %xmm2, %xmm4        /* ASCII hex for bytes 8..15 */

    movdqu  %xmm3, 2(%rsi)
    movdqu  %xmm4, 18(%rsi)

    /* --- Second 16 bytes (src32[16..31] -> dst67[34..65]) --- */
    movdqu  16(%rdi), %xmm0
    movdqa  %xmm0, %xmm1
    psrlw   $4, %xmm1
    pand    %xmm6, %xmm1        /* high nibbles */
    pand    %xmm6, %xmm0        /* low nibbles */

    movdqa  %xmm1, %xmm2
    punpcklbw %xmm0, %xmm1      /* interleaved nibbles for bytes 16..23 */
    punpckhbw %xmm0, %xmm2      /* interleaved nibbles for bytes 24..31 */

    movdqa  %xmm7, %xmm3
    pshufb  %xmm1, %xmm3        /* ASCII hex for bytes 16..23 */
    movdqa  %xmm7, %xmm4
    pshufb  %xmm2, %xmm4        /* ASCII hex for bytes 24..31 */

    movdqu  %xmm3, 34(%rsi)
    movdqu  %xmm4, 50(%rsi)

    /* Null terminator at dst67[66] */
    movb    $0, 66(%rsi)
    ret
    .size asm_bytes32_to_hex_0x, .-asm_bytes32_to_hex_0x


/*
 * int asm_const_time_eq(const char* a, const char* b, size_t len)
 * System V AMD64 ABI:
 *   %rdi = a
 *   %rsi = b
 *   %rdx = len
 * Returns 1 if equal, 0 otherwise, executing in constant time for fixed len.
 */
    .globl asm_const_time_eq
    .type asm_const_time_eq, @function
    .align 16
asm_const_time_eq:
    xorl    %eax, %eax          /* diff accumulator = 0 */
    testq   %rdx, %rdx
    jz      .Lct_done

    /* Process 8 bytes at a time when possible */
.Lct_loop8:
    cmpq    $8, %rdx
    jb      .Lct_loop1
    movq    (%rdi), %rcx
    xorq    (%rsi), %rcx
    orq     %rcx, %rax
    addq    $8, %rdi
    addq    $8, %rsi
    subq    $8, %rdx
    jmp     .Lct_loop8

.Lct_loop1:
    testq   %rdx, %rdx
    jz      .Lct_done
    movzbq  (%rdi), %rcx
    movzbq  (%rsi), %r8
    xorq    %r8, %rcx
    orq     %rcx, %rax
    incq    %rdi
    incq    %rsi
    decq    %rdx
    jmp     .Lct_loop1

.Lct_done:
    testq   %rax, %rax
    sete    %al
    movzbl  %al, %eax
    ret
    .size asm_const_time_eq, .-asm_const_time_eq


/*
 * uint32_t asm_crc32c_buffer(uint32_t crc, const uint8_t* buf, size_t len)
 * System V AMD64 ABI:
 *   %edi = initial crc
 *   %rsi = buf
 *   %rdx = len
 * Uses hardware SSE4.2 crc32q / crc32b instructions.
 */
    .globl asm_crc32c_buffer
    .type asm_crc32c_buffer, @function
    .align 16
asm_crc32c_buffer:
    movl    %edi, %eax
    notl    %eax                /* pre-invert CRC */

.Lcrc_loop8:
    cmpq    $8, %rdx
    jb      .Lcrc_loop1
    crc32q  (%rsi), %rax
    addq    $8, %rsi
    subq    $8, %rdx
    jmp     .Lcrc_loop8

.Lcrc_loop1:
    testq   %rdx, %rdx
    jz      .Lcrc_done
    crc32b  (%rsi), %eax
    incq    %rsi
    decq    %rdx
    jmp     .Lcrc_loop1

.Lcrc_done:
    notl    %eax                /* post-invert CRC */
    ret
    .size asm_crc32c_buffer, .-asm_crc32c_buffer


/*
 * void asm_simd_xor32(const uint8_t* a32, const uint8_t* b32, uint8_t* out32)
 * System V AMD64 ABI:
 *   %rdi = a32 (pointer to 32 bytes)
 *   %rsi = b32 (pointer to 32 bytes)
 *   %rdx = out32 (pointer to 32 bytes output)
 * Uses 128-bit XMM SIMD registers (movdqu + pxor) to combine 256-bit digests in 2 vector steps.
 */
    .globl asm_simd_xor32
    .type asm_simd_xor32, @function
    .align 16
asm_simd_xor32:
    movdqu  (%rdi), %xmm0
    movdqu  (%rsi), %xmm1
    pxor    %xmm1, %xmm0
    movdqu  %xmm0, (%rdx)

    movdqu  16(%rdi), %xmm2
    movdqu  16(%rsi), %xmm3
    pxor    %xmm3, %xmm2
    movdqu  %xmm2, 16(%rdx)
    ret
    .size asm_simd_xor32, .-asm_simd_xor32


/*
 * int32_t asm_simd_dot_i16(const int16_t* a, const int16_t* b, size_t count)
 * System V AMD64 ABI:
 *   %rdi = a (pointer to int16_t array)
 *   %rsi = b (pointer to int16_t array)
 *   %rdx = count (number of int16_t elements)
 * Uses x86_64 SIMD pmaddwd (Packed Multiply and Add Words to Doublewords)
 * to compute 8 signed 16-bit products and pairwise 32-bit additions per cycle.
 */
    .globl asm_simd_dot_i16
    .type asm_simd_dot_i16, @function
    .align 16
asm_simd_dot_i16:
    pxor    %xmm0, %xmm0        /* 4 x int32 accumulator = 0 */

.Ldot_simd_loop8:
    cmpq    $8, %rdx
    jb      .Ldot_simd_reduce
    movdqu  (%rdi), %xmm1       /* load 8 x int16 from a */
    movdqu  (%rsi), %xmm2       /* load 8 x int16 from b */
    pmaddwd %xmm2, %xmm1        /* 4 x int32 pairwise multiply-accumulate */
    paddd   %xmm1, %xmm0        /* accumulate into xmm0 */
    addq    $16, %rdi
    addq    $16, %rsi
    subq    $8, %rdx
    jmp     .Ldot_simd_loop8

.Ldot_simd_reduce:
    /* Horizontal reduction of 4 x int32 in %xmm0 -> %eax */
    movdqa  %xmm0, %xmm1
    psrldq  $8, %xmm1
    paddd   %xmm1, %xmm0
    movdqa  %xmm0, %xmm1
    psrldq  $4, %xmm1
    paddd   %xmm1, %xmm0
    movd    %xmm0, %eax

.Ldot_scalar_tail:
    testq   %rdx, %rdx
    jz      .Ldot_done
    movswl  (%rdi), %ecx
    movswl  (%rsi), %r8d
    imull   %r8d, %ecx
    addl    %ecx, %eax
    addq    $2, %rdi
    addq    $2, %rsi
    decq    %rdx
    jmp     .Ldot_scalar_tail

.Ldot_done:
    ret
    .size asm_simd_dot_i16, .-asm_simd_dot_i16

#endif

#if defined(__ELF__)
    .section .note.GNU-stack,"",@progbits
#endif

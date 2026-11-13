/*
 * fast_launcher.cpp — Native C/C++20 + x86_64 Assembly Startup & Port Engine
 *
 * Replaces slow shell loops (lsof, sleep 1, curl subprocesses) with raw Linux
 * syscalls, /proc/net/tcp parsing, non-blocking poll() socket probes (10ms
 * resolution), and hardware x86_64 SSE4.2 CRC32C + SHA-NI file fingerprinting.
 *
 * Subcommands:
 *   free-ports <port1> [port2 ...]
 *   wait-tcp <host> <port> <timeout_ms>
 *   wait-rpc <host> <port> <timeout_ms>
 *   wait-http <host> <port> <path> <expect_substr> <timeout_ms>
 *   fingerprint [--check | --update] <state_file> <file1> [file2 ...]
 *   benchmark
 */

#include "../backend/src/native/sha256_engine.h"

#include <arpa/inet.h>
#include <chrono>
#include <csignal>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <dirent.h>
#include <fcntl.h>
#include <fstream>
#include <iostream>
#include <netinet/in.h>
#include <poll.h>
#include <set>
#include <sstream>
#include <string>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <thread>
#include <unistd.h>
#include <unordered_set>
#include <vector>

#ifndef MSG_NOSIGNAL
#define MSG_NOSIGNAL 0
#endif

namespace {

using Clock = std::chrono::steady_clock;

/* Parse /proc/net/tcp and /proc/net/tcp6 to find socket inodes listening on target ports */
void collect_listening_inodes(const std::unordered_set<uint16_t>& ports, std::unordered_set<unsigned long>& inodes) {
    const char* proc_files[] = {"/proc/net/tcp", "/proc/net/tcp6"};
    for (const char* path : proc_files) {
        std::ifstream f(path);
        if (!f.is_open()) continue;
        std::string line;
        std::getline(f, line); /* skip header */
        while (std::getline(f, line)) {
            std::istringstream iss(line);
            std::string sl, local_addr, rem_addr, st;
            if (!(iss >> sl >> local_addr >> rem_addr >> st)) continue;
            /* st == "0A" means TCP_LISTEN */
            if (st != "0A") continue;

            auto colon = local_addr.rfind(':');
            if (colon == std::string::npos) continue;
            unsigned int port = 0;
            if (std::sscanf(local_addr.c_str() + colon + 1, "%X", &port) != 1) continue;
            if (ports.find(static_cast<uint16_t>(port)) == ports.end()) continue;

            /* Skip tx_queue:rx_queue, tr:tm->when, retrnsmt, uid, timeout */
            std::string dummy;
            unsigned long inode = 0;
            if (iss >> dummy >> dummy >> dummy >> dummy >> dummy >> inode) {
                if (inode > 0) inodes.insert(inode);
            }
        }
    }
}

/* Scan /proc/<pid>/fd entries to match socket:[inode] and kill matching processes */
int cmd_free_ports(int argc, char** argv) {
    std::unordered_set<uint16_t> ports;
    for (int i = 2; i < argc; ++i) {
        int p = std::atoi(argv[i]);
        if (p > 0 && p < 65536) ports.insert(static_cast<uint16_t>(p));
    }
    if (ports.empty()) return 0;

    std::unordered_set<unsigned long> inodes;
    collect_listening_inodes(ports, inodes);
    if (inodes.empty()) return 0;

    pid_t self_pid = getpid();
    std::set<pid_t> killed_pids;

    DIR* proc_dir = opendir("/proc");
    if (!proc_dir) return 0;

    struct dirent* entry;
    while ((entry = readdir(proc_dir)) != nullptr) {
        char* endptr = nullptr;
        long pid_long = std::strtol(entry->d_name, &endptr, 10);
        if (*endptr != '\0' || pid_long <= 1 || pid_long == self_pid) continue;
        pid_t pid = static_cast<pid_t>(pid_long);

        std::string fd_path = std::string("/proc/") + entry->d_name + "/fd";
        DIR* fd_dir = opendir(fd_path.c_str());
        if (!fd_dir) continue;

        struct dirent* fd_entry;
        char link_buf[128];
        while ((fd_entry = readdir(fd_dir)) != nullptr) {
            if (fd_entry->d_name[0] == '.') continue;
            std::string full_fd = fd_path + "/" + fd_entry->d_name;
            ssize_t len = readlink(full_fd.c_str(), link_buf, sizeof(link_buf) - 1);
            if (len <= 0) continue;
            link_buf[len] = '\0';
            unsigned long inode = 0;
            if (std::sscanf(link_buf, "socket:[%lu]", &inode) == 1) {
                if (inodes.find(inode) != inodes.end()) {
                    kill(pid, SIGKILL);
                    killed_pids.insert(pid);
                    break;
                }
            }
        }
        closedir(fd_dir);
    }
    closedir(proc_dir);

    if (!killed_pids.empty()) {
        /* Wait briefly (up to 60ms in 5ms steps) until ports close */
        for (int attempt = 0; attempt < 12; ++attempt) {
            std::unordered_set<unsigned long> remaining;
            collect_listening_inodes(ports, remaining);
            if (remaining.empty()) break;
            std::this_thread::sleep_for(std::chrono::milliseconds(5));
        }
    }
    return 0;
}

/* Non-blocking TCP connect with millisecond timeout (portable across Linux, macOS, FreeBSD) */
int connect_nonblocking(const char* host, uint16_t port, int timeout_ms) {
#ifdef SOCK_NONBLOCK
    int sock = socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0);
    if (sock < 0) return -1;
#else
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) return -1;
    int init_flags = fcntl(sock, F_GETFL, 0);
    fcntl(sock, F_SETFL, init_flags | O_NONBLOCK);
#endif

    struct sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(port);
    if (inet_pton(AF_INET, host, &addr.sin_addr) <= 0) {
        inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);
    }

    int res = connect(sock, reinterpret_cast<struct sockaddr*>(&addr), sizeof(addr));
    if (res == 0) {
        int flags = fcntl(sock, F_GETFL, 0);
        fcntl(sock, F_SETFL, flags & ~O_NONBLOCK);
        return sock;
    }
    if (errno != EINPROGRESS) {
        close(sock);
        return -1;
    }

    struct pollfd pfd{};
    pfd.fd = sock;
    pfd.events = POLLOUT;
    if (poll(&pfd, 1, timeout_ms) <= 0) {
        close(sock);
        return -1;
    }

    int so_error = 0;
    socklen_t len = sizeof(so_error);
    if (getsockopt(sock, SOL_SOCKET, SO_ERROR, &so_error, &len) < 0 || so_error != 0) {
        close(sock);
        return -1;
    }

    int flags = fcntl(sock, F_GETFL, 0);
    fcntl(sock, F_SETFL, flags & ~O_NONBLOCK);
    return sock;
}

int cmd_wait_tcp(const char* host, uint16_t port, int timeout_ms) {
    auto deadline = Clock::now() + std::chrono::milliseconds(timeout_ms);
    while (Clock::now() < deadline) {
        int sock = connect_nonblocking(host, port, 50);
        if (sock >= 0) {
            close(sock);
            return 0;
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }
    return 1;
}

bool send_and_match_http(const char* host, uint16_t port, const std::string& raw_req, const std::string& expect_substr) {
    int sock = connect_nonblocking(host, port, 100);
    if (sock < 0) return false;

    struct timeval tv{0, 200000}; /* 200ms read/write timeout */
    setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));
    setsockopt(sock, SOL_SOCKET, SO_SNDTIMEO, &tv, sizeof(tv));

    ssize_t sent = send(sock, raw_req.data(), raw_req.size(), MSG_NOSIGNAL);
    if (sent <= 0) {
        close(sock);
        return false;
    }

    char buf[4096];
    std::string response;
    ssize_t n = 0;
    while ((n = recv(sock, buf, sizeof(buf) - 1, 0)) > 0) {
        buf[n] = '\0';
        response.append(buf, static_cast<size_t>(n));
        if (expect_substr.empty() || response.find(expect_substr) != std::string::npos) {
            close(sock);
            return true;
        }
    }
    close(sock);
    return !response.empty() && (expect_substr.empty() || response.find(expect_substr) != std::string::npos);
}

int cmd_wait_rpc(const char* host, uint16_t port, int timeout_ms) {
    const std::string body = "{\"jsonrpc\":\"2.0\",\"method\":\"eth_chainId\",\"params\":[],\"id\":1}";
    std::ostringstream oss;
    oss << "POST / HTTP/1.1\r\n"
        << "Host: " << host << ":" << port << "\r\n"
        << "Content-Type: application/json\r\n"
        << "Content-Length: " << body.size() << "\r\n"
        << "Connection: close\r\n\r\n"
        << body;
    const std::string req = oss.str();

    auto deadline = Clock::now() + std::chrono::milliseconds(timeout_ms);
    while (Clock::now() < deadline) {
        if (send_and_match_http(host, port, req, "\"result\"")) {
            return 0;
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(15));
    }
    return 1;
}

int cmd_wait_http(const char* host, uint16_t port, const char* path, const char* expect_substr, int timeout_ms) {
    std::ostringstream oss;
    oss << "GET " << path << " HTTP/1.1\r\n"
        << "Host: " << host << ":" << port << "\r\n"
        << "Connection: close\r\n\r\n";
    const std::string req = oss.str();

    auto deadline = Clock::now() + std::chrono::milliseconds(timeout_ms);
    while (Clock::now() < deadline) {
        if (send_and_match_http(host, port, req, expect_substr ? expect_substr : "HTTP/1.1")) {
            return 0;
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(15));
    }
    return 1;
}

/* Compute combined hardware CRC32C + SHA-NI fingerprint of input files */
std::string compute_files_fingerprint(int start_idx, int argc, char** argv) {
    uint32_t combined_crc = 0;
    std::string concat_digests;

    for (int i = start_idx; i < argc; ++i) {
        std::ifstream f(argv[i], std::ios::binary);
        if (!f.is_open()) {
            concat_digests += "MISSING:";
            concat_digests += argv[i];
            continue;
        }
        std::string content((std::istreambuf_iterator<char>(f)), std::istreambuf_iterator<char>());
        combined_crc = asm_crc32c_buffer(
            combined_crc,
            reinterpret_cast<const uint8_t*>(content.data()),
            content.size()
        );
        char hex67[67];
        c_sha256_hex_0x(reinterpret_cast<const uint8_t*>(content.data()), content.size(), hex67);
        concat_digests += hex67;
    }

    char final_hex[67];
    c_sha256_hex_0x(
        reinterpret_cast<const uint8_t*>(concat_digests.data()),
        concat_digests.size(),
        final_hex
    );

    char out[96];
    std::snprintf(out, sizeof(out), "%08x:%s", combined_crc, final_hex);
    return std::string(out);
}

int cmd_fingerprint(int argc, char** argv) {
    if (argc < 5) return 1;
    std::string mode = argv[2];
    std::string state_file = argv[3];
    std::string current_fp = compute_files_fingerprint(4, argc, argv);

    if (mode == "--check") {
        std::ifstream in(state_file);
        if (!in.is_open()) return 1;
        std::string saved_fp;
        std::getline(in, saved_fp);
        if (saved_fp.size() == current_fp.size() &&
            asm_const_time_eq(saved_fp.data(), current_fp.data(), current_fp.size()) == 1) {
            return 0; /* up-to-date! */
        }
        return 1;
    } else if (mode == "--update") {
        std::ofstream out(state_file, std::ios::trunc);
        if (!out.is_open()) return 1;
        out << current_fp << "\n";
        return 0;
    }
    return 1;
}

int cmd_benchmark() {
    std::vector<uint8_t> payload(1024 * 1024, 0x61); /* 1 MB buffer */
    char hex67[67];

    auto t0 = Clock::now();
    const int iterations = 100;
    uint32_t crc = 0;
    for (int i = 0; i < iterations; ++i) {
        c_sha256_hex_0x(payload.data(), payload.size(), hex67);
        crc ^= asm_crc32c_buffer(crc, payload.data(), payload.size());
    }
    auto t1 = Clock::now();
    double ms = std::chrono::duration<double, std::milli>(t1 - t0).count();
    double throughput_mb_s = (iterations * 1.0) / (ms / 1000.0);

    alignas(16) int16_t vec_a[64];
    alignas(16) int16_t vec_b[64];
    for (int i = 0; i < 64; ++i) {
        vec_a[i] = static_cast<int16_t>((i * 7) + 3);
        vec_b[i] = static_cast<int16_t>((i * 5) - 11);
    }
    auto t2 = Clock::now();
    int32_t simd_dot = 0;
    for (int i = 0; i < 100000; ++i) {
        simd_dot ^= asm_simd_dot_i16(vec_a, vec_b, 64);
    }
    auto t3 = Clock::now();
    double simd_ms = std::chrono::duration<double, std::milli>(t3 - t2).count();
    double simd_mops = (100000.0 * 64.0 / 1e6) / (simd_ms / 1000.0);

    const char* leaves[16];
    for (int i = 0; i < 16; ++i) leaves[i] = hex67;
    char merkle_root[67];
    c_compute_merkle_root_hex_0x(leaves, 16, merkle_root);

    std::printf(
        "[Native C11/C++20/x86_64-SIMD Engine] SHA-NI=%s | 100MB SHA-256+SSSE3-Hex+CRC32C: %.2f ms (%.1f MB/s) | SIMD pmaddwd Dot: %.1f MOps/s (dot=%d) | MerkleRoot=%s\n",
        c_has_sha_ni() ? "ENABLED" : "SCALAR",
        ms,
        throughput_mb_s,
        simd_mops,
        simd_dot,
        merkle_root
    );
    return 0;
}

} // namespace

int main(int argc, char** argv) {
    if (argc < 2) {
        std::cerr << "Usage: " << argv[0] << " <free-ports|wait-tcp|wait-rpc|wait-http|fingerprint|benchmark> ...\n";
        return 1;
    }

    std::string cmd = argv[1];
    if (cmd == "free-ports") {
        return cmd_free_ports(argc, argv);
    } else if (cmd == "wait-tcp" && argc >= 5) {
        return cmd_wait_tcp(argv[2], static_cast<uint16_t>(std::atoi(argv[3])), std::atoi(argv[4]));
    } else if (cmd == "wait-rpc" && argc >= 5) {
        return cmd_wait_rpc(argv[2], static_cast<uint16_t>(std::atoi(argv[3])), std::atoi(argv[4]));
    } else if (cmd == "wait-http" && argc >= 7) {
        return cmd_wait_http(argv[2], static_cast<uint16_t>(std::atoi(argv[3])), argv[4], argv[5], std::atoi(argv[6]));
    } else if (cmd == "fingerprint") {
        return cmd_fingerprint(argc, argv);
    } else if (cmd == "benchmark") {
        return cmd_benchmark();
    }

    return 1;
}

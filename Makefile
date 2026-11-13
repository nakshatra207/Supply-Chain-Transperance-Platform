# Makefile — Builds Native C11, C++20, and Multi-Arch (x86_64 ASM / ARM64) Accelerators
#
# Targets:
#   1. backend/src/native/organic_native.node (N-API C/C++/ASM addon for Node.js)
#   2. native/fast_launcher                   (Native C/C++/ASM startup & socket engine)

CC      ?= gcc
CXX     ?= g++
UNAME_S := $(shell uname -s 2>/dev/null || echo Linux)
UNAME_M := $(shell uname -m 2>/dev/null || echo x86_64)

ARCH_FLAGS :=
ifeq ($(UNAME_M),x86_64)
  ARCH_FLAGS := -msse4.2 -mssse3
endif
ifeq ($(UNAME_M),amd64)
  ARCH_FLAGS := -msse4.2 -mssse3
endif

SHARED_LDFLAGS := -shared -O3
ifeq ($(UNAME_S),Darwin)
  SHARED_LDFLAGS += -undefined dynamic_lookup
endif

CFLAGS  := -O3 $(ARCH_FLAGS) -fPIC -Wall -Wextra -std=c11
CXXFLAGS:= -O3 $(ARCH_FLAGS) -fPIC -Wall -Wextra -Wno-unused-parameter -std=c++20
ASFLAGS := -fPIC

NODE_BIN := $(shell which node 2>/dev/null)
NODE_PREFIX := $(shell dirname $$(dirname $(NODE_BIN)) 2>/dev/null)
NODE_INC := $(NODE_PREFIX)/include/node
ifeq ($(wildcard $(NODE_INC)/node_api.h),)
  NODE_INC := /usr/include/node
endif
ifeq ($(wildcard $(NODE_INC)/node_api.h),)
  NODE_INC := /usr/local/include/node
endif

ADDON_TARGET   := backend/src/native/organic_native.node
LAUNCHER_TARGET:= native/fast_launcher

NATIVE_ASM_SRC := backend/src/native/fast_asm.S
NATIVE_C_SRC   := backend/src/native/sha256_engine.c
NATIVE_CPP_SRC := backend/src/native/addon.cpp
LAUNCHER_SRC   := native/fast_launcher.cpp

.PHONY: all addon launcher benchmark clean

all: addon launcher

addon: $(ADDON_TARGET)

$(ADDON_TARGET): $(NATIVE_ASM_SRC) $(NATIVE_C_SRC) $(NATIVE_CPP_SRC) backend/src/native/sha256_engine.h
	$(CC) $(ASFLAGS) -c $(NATIVE_ASM_SRC) -o backend/src/native/fast_asm.o
	$(CC) $(CFLAGS) -c $(NATIVE_C_SRC) -o backend/src/native/sha256_engine.o
	$(CXX) $(CXXFLAGS) -I$(NODE_INC) -DNODE_GYP_MODULE_NAME=organic_native -c $(NATIVE_CPP_SRC) -o backend/src/native/addon.o
	$(CXX) $(SHARED_LDFLAGS) backend/src/native/fast_asm.o backend/src/native/sha256_engine.o backend/src/native/addon.o -o $(ADDON_TARGET)

launcher: $(LAUNCHER_TARGET)

$(LAUNCHER_TARGET): $(LAUNCHER_SRC) $(NATIVE_ASM_SRC) $(NATIVE_C_SRC) backend/src/native/sha256_engine.h
	$(CC) $(ASFLAGS) -c $(NATIVE_ASM_SRC) -o backend/src/native/fast_asm.o
	$(CC) $(CFLAGS) -c $(NATIVE_C_SRC) -o backend/src/native/sha256_engine.o
	$(CXX) $(CXXFLAGS) $(LAUNCHER_SRC) backend/src/native/fast_asm.o backend/src/native/sha256_engine.o -lpthread -o $(LAUNCHER_TARGET)

benchmark: all
	./$(LAUNCHER_TARGET) benchmark

clean:
	rm -f backend/src/native/*.o $(ADDON_TARGET) $(LAUNCHER_TARGET)

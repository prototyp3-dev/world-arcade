GO := go
GOARCH_WASM := wasm
GOOS_WASM := js
GO_WASMER := tinygo
WASM_OPT := wasm-opt

.PHONY: clean dapp dapp.wasm

all: dapp dapp.wasm

dapp:
	# $(GO) mod tidy
	$(GO) build dapp.go

dapp.wasm:
	GOARCH=$(GOARCH_WASM) GOOS=$(GOOS_WASM) $(GO_WASMER) build -o dapp.wasm -gc=leaking -no-debug -panic=trap dapp_wasm.go
ifneq ("$(shell which $(WASM_OPT))","")
	$(WASM_OPT) -O dapp.wasm -o dapp.wasm
endif

clean:
	@rm -rf dapp

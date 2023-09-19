# syntax=docker.io/docker/dockerfile:1.4
FROM ubuntu:22.04 as build-stage

RUN <<EOF
apt update
apt install -y --no-install-recommends \
    build-essential=12.9ubuntu3 \
    ca-certificates \
    g++-riscv64-linux-gnu=4:11.2.0--1ubuntu1 \
    wget
EOF

WORKDIR /opt/build

ARG GOVERSION=1.20.5

RUN wget https://go.dev/dl/go${GOVERSION}.linux-$(dpkg --print-architecture).tar.gz && \
    tar -C /usr/local -xzf go${GOVERSION}.linux-$(dpkg --print-architecture).tar.gz


ARG TINYGOVERSION=0.28.1

RUN wget https://github.com/tinygo-org/tinygo/releases/download/v${TINYGOVERSION}/tinygo_${TINYGOVERSION}_$(dpkg --print-architecture).deb && \
    dpkg -i tinygo_${TINYGOVERSION}_$(dpkg --print-architecture).deb

# RUN apt install libstdc++6:armhf # for arm64 arch


ARG BINARENVERSION=113

RUN ARCH= && dpkgArch="$(dpkg --print-architecture)" && \
    case "${dpkgArch##*-}" in \
      amd64) ARCH='x86_64-linux';; \
      # arm64) ARCH='arm64-macos';; \
      *) echo "unsupported architecture"; exit 0 ;; \
    esac && \
    wget https://github.com/WebAssembly/binaryen/releases/download/version_${BINARENVERSION}/binaryen-version_${BINARENVERSION}-${ARCH}.tar.gz && \
    tar xvz binaryen-version_${BINARENVERSION}/bin/wasm-opt -f binaryen-version_${BINARENVERSION}-${ARCH}.tar.gz && \
    cp binaryen-version_${BINARENVERSION}/bin/wasm-opt /usr/local/bin/.


ENV PATH=/usr/local/go/bin:${PATH}
ENV GOOS=linux
ENV GOARCH=riscv64
ENV CGO_ENABLED=1
ENV CC=riscv64-linux-gnu-gcc

COPY src .
RUN make

RUN wget -O machine-emulator-tools.deb https://github.com/cartesi/machine-emulator-tools/releases/download/v0.12.0/machine-emulator-tools-v0.12.0.deb

FROM --platform=linux/riscv64 riv/toolchain:devel AS riv-toolchain

# runtime stage: produces final image that will be executed
FROM --platform=linux/riscv64 riscv64/ubuntu:22.04

LABEL io.sunodo.sdk_version=0.2.0-riv
LABEL io.cartesi.rollups.ram_size=128Mi

# install cartesi tools
COPY --from=build-stage /opt/build/machine-emulator-tools.deb .
RUN dpkg -i machine-emulator-tools.deb && rm -f machine-emulator-tools.deb

# install riv rootfs
COPY --from=riv-toolchain /rootfs /rivos
RUN cp /rivos/etc/sysctl.conf /etc/sysctl.conf
RUN mkdir -p /rivos/cartridges

# install custom init
COPY --from=riv-toolchain /rootfs/sbin/init /opt/cartesi/bin/init

# install musl libc
RUN ln -s /rivos/lib/ld-musl-riscv64.so.1 /lib/

# install busybox
RUN ln -s /rivos/usr/bin/busybox /usr/bin/busybox

# install riv-chroot
RUN ln -s /rivos/usr/bin/bwrap /usr/bin/ && \
    ln -s /rivos/usr/lib/libcap.so.2 /usr/lib/ && \
    ln -s /rivos/sbin/riv-chroot /sbin/

# install dapp
WORKDIR /opt/cartesi/dapp
COPY --from=build-stage /opt/build/dapp .
COPY --from=build-stage /opt/build/dapp.wasm .

ENV ROLLUP_HTTP_SERVER_URL="http://127.0.0.1:5004"

ENTRYPOINT ["/opt/cartesi/bin/rollup-init"]
CMD ["/opt/cartesi/dapp/dapp"]

FROM --platform=linux/riscv64 riv/toolchain:devel AS riv-toolchain
FROM sunodo/sdk:0.2.0

COPY --from=riv-toolchain /root/linux.bin /usr/share/cartesi-machine/images/linux.bin

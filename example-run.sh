# verify a replay
riv-chroot /rivos \
    --ro-bind /opt/cartesi/dapp/cartridges /cartridges \
    --ro-bind /opt/cartesi/dapp/replays /replays \
    --setenv RIV_CARTRIDGE /cartridges/snake.sqfs \
    --setenv RIV_REPLAYLOG /replays/snake.rivlog \
    --setenv RIV_OUTCARD /run/outcard \
    --setenv RIV_NO_YIELD y \
    --setenv RIV_SAVE_SCREENSHOT /run/screenshot.png \
    riv-run

# retrive results from output card (usually a JSON)
cat /run/outcard; echo
rm -f /run/outcard

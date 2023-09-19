package main

import (
  "fmt"
  "encoding/json"
  "github.com/prototyp3-dev/go-rollups/rollups"
  "github.com/prototyp3-dev/go-rollups/handler/abi"
  "dapp/processor"
  "syscall/js"
)

var noticeCodec *abihandler.Codec
var sendCartridgeCodec *abihandler.Codec
var sendCartridgeChunkCodec *abihandler.Codec
var removeCartridgeCodec *abihandler.Codec
var sendReplayCodec *abihandler.Codec
var sendReplayChunkCodec *abihandler.Codec

func DecodeVerifyReplayNotice(this js.Value, args []js.Value) interface{} {
  if len(args) == 0 {
    return nil
  }
  value, err := noticeCodec.Decode(args[0].String())
  if err != nil {
    fmt.Println("Error:",err)
    return nil
  }

  id,ok1 := value["0"].(string)
  user,ok2 := value["1"].(string)
  address,ok3 := value["2"].(abihandler.Address)
  timestamp,ok4 := value["3"].(uint64)
  valid,ok5 := value["4"].(bool)
  outcard,ok6 := value["5"].(string)
  if !ok1 || !ok2 || !ok3 || !ok4 || !ok5 || !ok6 {
    fmt.Println("Error: converting values")
    return nil
  }

  result, err := json.Marshal(struct{
    Array []interface{}
  }{[]interface{}{id,user,abihandler.Address2Hex(address),timestamp,valid,outcard}})
  if err != nil {
    fmt.Println("Error:",err)
    return nil
  }

  return string(result)
}

func jsValue2Bin(arg js.Value) []byte {
  argStr := arg.String()
  if argStr == "" {
    return make([]byte,0)
  }
  bin, err := rollups.Hex2Bin(argStr)
  if err != nil {
    fmt.Println("Error:",err)
    return make([]byte,0)
  }
  return bin
}

func EncodeAddCartridge(this js.Value, args []js.Value) interface{} {
  if len(args) == 0 {
    return nil
  }
  value, err := sendCartridgeCodec.Encode([]interface{}{args[0].String(),jsValue2Bin(args[1])})
  if err != nil {
    fmt.Println("Error:",err)
    return nil
  }
  return value
}

func EncodeAddCartridgeChunk(this js.Value, args []js.Value) interface{} {
  if len(args) == 0 {
    return nil
  }
  value, err := sendCartridgeChunkCodec.Encode([]interface{}{args[0].String(),jsValue2Bin(args[1])})
  if err != nil {
    fmt.Println("Error:",err)
    return nil
  }
  return value
}

func RemoveCartridge(this js.Value, args []js.Value) interface{} {
  if len(args) == 0 {
    return nil
  }
  value, err := removeCartridgeCodec.Encode([]interface{}{args[0].String()})
  if err != nil {
    fmt.Println("Error:",err)
    return nil
  }
  return value
}

func EncodeReplay(this js.Value, args []js.Value) interface{} {
  if len(args) == 0 {
    return nil
  }
  value, err := sendReplayCodec.Encode([]interface{}{args[0].String(),args[1].String(),jsValue2Bin(args[2]),args[3].String(),jsValue2Bin(args[4]),jsValue2Bin(args[5])})
  if err != nil {
    fmt.Println("Error:",err)
    return nil
  }
  return value
}

func EncodeReplayChunk(this js.Value, args []js.Value) interface{} {
  if len(args) == 0 {
    return nil
  }
  value, err := sendReplayChunkCodec.Encode([]interface{}{args[0].String(),args[1].String(),jsValue2Bin(args[2]),args[3].String(),jsValue2Bin(args[4]),jsValue2Bin(args[5])})
  if err != nil {
    fmt.Println("Error:",err)
    return nil
  }
  return value
}

func PrepareData(this js.Value, args []js.Value) interface{} {
  if len(args) == 0 {
    return nil
  }
  value, err := processor.PrepareDataToSend(jsValue2Bin(args[0]),uint64(args[1].Int()))
  if err != nil {
    fmt.Println("Error:",err)
    return nil
  }
  valueInterface := make([]interface{}, len(value))
  for i, v := range value {
    valueInterface[i] = v
  }
  return valueInterface
}

func GenerateCartridgeId(this js.Value, args []js.Value) interface{} {
  if len(args) == 0 {
    return nil
  }
  value := processor.GenerateCartridgeId([]byte(args[0].String()))
  return value
}

func main() {
  noticeCodec = abihandler.NewCodec([]string{"string","string","address","uint64","bool","string"}) // id, user, player, timestamp, valid, outcard
  sendCartridgeCodec = abihandler.NewHeaderCodec("riv","addCartridge",[]string{"string","bytes"})// id, bin
  sendCartridgeChunkCodec = abihandler.NewHeaderCodec("riv","addCartridgeChunk",[]string{"string","bytes"})// id, bin
  removeCartridgeCodec = abihandler.NewHeaderCodec("riv","removeCartridge",[]string{"string"}) // id
  sendReplayCodec = abihandler.NewHeaderCodec("riv","verifyReplay",[]string{"string","string","bytes","string","bytes","bytes"}) // id, user, outCardHash, args, inCard, bin
  sendReplayChunkCodec = abihandler.NewHeaderCodec("riv","verifyReplayChunk",[]string{"string","string","bytes","string","bytes","bytes"}) // id, user, outCardHash, args, inCard, bin

  wait := make(chan struct{},0)
  fmt.Println("DAPP WASM initialized")
  js.Global().Set("decodeVerifyReplayNotice", js.FuncOf(DecodeVerifyReplayNotice))
  js.Global().Set("encodeAddCartridge", js.FuncOf(EncodeAddCartridge))
  js.Global().Set("encodeAddCartridgeChunk", js.FuncOf(EncodeAddCartridgeChunk))
  js.Global().Set("encodeRemoveCartridge", js.FuncOf(RemoveCartridge))
  js.Global().Set("encodeReplay", js.FuncOf(EncodeReplay))
  js.Global().Set("encodeReplayChunk", js.FuncOf(EncodeReplayChunk))
  js.Global().Set("prepareData", js.FuncOf(PrepareData))
  js.Global().Set("generateCartridgeId", js.FuncOf(GenerateCartridgeId))
  <- wait
}
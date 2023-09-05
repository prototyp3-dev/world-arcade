package main

import (
  "fmt"

  "github.com/prototyp3-dev/go-rollups/rollups"
  "github.com/prototyp3-dev/go-rollups/handler/abi"
  "dapp/processor"
  "syscall/js"
  "math/big"
  "strings"
)

var noticeCodec *abihandler.Codec
var sendCartridgeCodec *abihandler.Codec
var sendCartridgeChunkCodec *abihandler.Codec
var removeCartridgeCodec *abihandler.Codec
var sendReplayCodec *abihandler.Codec
var sendReplayChunkCodec *abihandler.Codec
var sendEditCardCodec *abihandler.Codec
var sendEditCardChunkCodec *abihandler.Codec

func DecodeScoreNotice(this js.Value, args []js.Value) interface{} {
  if len(args) == 0 {
    return nil
  }
  value, err := noticeCodec.Decode(args[0].String())
  if err != nil {
    fmt.Println("Error:",err)
    return nil
  }

  id,ok1 := value["0"].(string)
  player,ok2 := value["1"].(abihandler.Address)
  ts,ok3 := value["2"].(uint64)
  finished,ok4 := value["3"].(bool)
  card,ok5 := value["4"].(string)
  lenScores,ok6 := value["5"].(*big.Int)
  scoreBytes,ok7 := value["6"].([]byte)
  if !ok1 || !ok2 || !ok3 || !ok4 || !ok5 || !ok6 || !ok7 {
    fmt.Println("Error: converting values")
    return value
  }

  scores := make([]string,lenScores.Int64())
  for i := big.NewInt(0); i.Cmp(lenScores) == -1 ; i.Add(i,big.NewInt(1)) {
    ind := i.Int64()
    score := new(big.Int)
    score.SetBytes(scoreBytes[(ind*32):((ind+1)*32)])
    scores[ind] = fmt.Sprintf("%d",score)
  }

  result := fmt.Sprintf("%s,%s,%d,%t,%s,%s",id,abihandler.Address2Hex(player),ts,finished,card,strings.Join(scores,","))

  // jsonValue, err := json.Marshal(struct{
  //   Array []interface{}
  // }{[]interface{}{id,abihandler.Address2Hex(player),ts,finished,card,scores}})
  // if err != nil {
  //   fmt.Println("Error:",err)
  //   return nil
  // }

  return result
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
  value, err := sendCartridgeCodec.Encode([]interface{}{args[0].String(),args[1].String(),jsValue2Bin(args[2])})
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
  value, err := sendCartridgeChunkCodec.Encode([]interface{}{args[0].String(),args[1].String(),jsValue2Bin(args[2])})
  if err != nil {
    fmt.Println("Error:",err)
    return nil
  }
  return value
}

func EncodeEditCartridge(this js.Value, args []js.Value) interface{} {
  if len(args) == 0 {
    return nil
  }
  value, err := sendEditCardCodec.Encode([]interface{}{args[0].String(),jsValue2Bin(args[1])})
  if err != nil {
    fmt.Println("Error:",err)
    return nil
  }
  return value
}

func EncodeEditCartridgeChunk(this js.Value, args []js.Value) interface{} {
  if len(args) == 0 {
    return nil
  }
  value, err := sendEditCardChunkCodec.Encode([]interface{}{args[0].String(),jsValue2Bin(args[1])})
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
  value, err := sendReplayCodec.Encode([]interface{}{args[0].String(),jsValue2Bin(args[1]),args[2].String(),jsValue2Bin(args[3]),jsValue2Bin(args[4])})
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
  value, err := sendReplayChunkCodec.Encode([]interface{}{args[0].String(),jsValue2Bin(args[1]),args[2].String(),jsValue2Bin(args[3]),jsValue2Bin(args[4])})
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

// func GenerateCartridgeId(this js.Value, args []js.Value) interface{} {
//   if len(args) == 0 {
//     return nil
//   }
//   value := processor.GenerateCartridgeId([]byte(args[0].String()))
//   return value
// }

func main() {
  // noticeCodec = abihandler.NewCodec([]string{"string","address","uint64","bool","string","uint[]"}) // id, player, ts, finished, result_card, scores
  noticeCodec = abihandler.NewCodec([]string{"string","address","uint64","bool","string","uint","bytes"}) // id, player, ts, finished, result_card, scoreslen, scoresbytes
  sendCartridgeCodec = abihandler.NewHeaderCodec("riv","addCartridge",[]string{"string","string","bytes"})// name, description, bin
  sendCartridgeChunkCodec = abihandler.NewHeaderCodec("riv","addCartridgeChunk",[]string{"string","string","bytes"})// name, description, bin
  removeCartridgeCodec = abihandler.NewHeaderCodec("riv","removeCartridge",[]string{"string"}) // id
  sendEditCardCodec = abihandler.NewHeaderCodec("riv","editCartridgeCard",[]string{"string","bytes"}) // id, bin
  sendEditCardChunkCodec = abihandler.NewHeaderCodec("riv","editCartridgeCardChunk",[]string{"string","bytes"}) // id, bin
  sendReplayCodec = abihandler.NewHeaderCodec("riv","verifyReplay",[]string{"string","bytes","string","bytes","bytes"}) // id, resultHash, args, card, gameplay
  sendReplayChunkCodec = abihandler.NewHeaderCodec("riv","verifyReplayChunk",[]string{"string","bytes","string","bytes","bytes"}) // id, resultHash, args, card, gameplay

  wait := make(chan struct{},0)
  fmt.Println("DAPP WASM initialized")
  js.Global().Set("decodeScoreNotice", js.FuncOf(DecodeScoreNotice))
  js.Global().Set("encodeAddCartridge", js.FuncOf(EncodeAddCartridge))
  js.Global().Set("encodeAddCartridgeChunk", js.FuncOf(EncodeAddCartridgeChunk))
  js.Global().Set("encodeEditCartridge", js.FuncOf(EncodeEditCartridge))
  js.Global().Set("encodeEditCartridgeChunk", js.FuncOf(EncodeEditCartridgeChunk))
  js.Global().Set("encodeRemoveCartridge", js.FuncOf(RemoveCartridge))
  js.Global().Set("encodeReplay", js.FuncOf(EncodeReplay))
  js.Global().Set("encodeReplayChunk", js.FuncOf(EncodeReplayChunk))
  js.Global().Set("prepareData", js.FuncOf(PrepareData))
  // js.Global().Set("generateCartridgeId", js.FuncOf(GenerateCartridgeId))
  <- wait
}
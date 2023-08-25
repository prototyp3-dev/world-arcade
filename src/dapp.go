package main

import (
  "fmt"
  "log"
  "os"
  "path/filepath"
  "io/ioutil"
  "strings"
  // "strconv"
  "encoding/json"
  "regexp"
  "os/exec"
  "math/big"
  "crypto/sha256"

  "github.com/prototyp3-dev/go-rollups/rollups"
  "github.com/prototyp3-dev/go-rollups/handler/uri"
  "github.com/prototyp3-dev/go-rollups/handler/abi"

  "dapp/model"
  "dapp/processor"
)

var infolog = log.New(os.Stderr, "[ info ]  ", log.Lshortfile)

var cartridges map[string]*model.Cartridge

var cartridgeUploads map[string]*model.Cartridge
var replayUploads map[string]*model.Replay

var scoreNoticeCodec *abihandler.Codec

var cartridgesPath string
var scorefilename string
var maxReportBytes int

//
// Reports
//

func reportSuccess(cartridgeId string) error {

  messageJson,err := json.Marshal(struct{
    Status model.Status           `json:"status"`
    Hash string                   `json:"hash"`
  }{model.Success,cartridgeId})
  if err != nil {
    return fmt.Errorf("reportSuccess: creating message: %s", err)
  }

  report := rollups.Report{rollups.Str2Hex(string(messageJson))}
  _, err = rollups.SendReport(&report)
  if err != nil {
    return fmt.Errorf("reportSuccess: error making http request: %s", err)
  }

  return nil
}

func noticeVerifyReplay(replay *model.Replay, finished bool, resultCard string, scores []*big.Int) error {
  // scoreNoticeCodec = abihandler.NewCodec([]string{"string","address","uint64","bool","uint[]","string"}) // id, player, ts, finished, result_card, scores
  // noticePayload,err := scoreNoticeCodec.Encode([]interface{}{replay.CartridgeId,replay.UserAddress,replay.SubmittedAt,finished,resultCard,scores})
  scoreBytes := make([]byte,0)
  var buf []byte
  for _,score := range scores {
    buf = make([]byte,32,32)
    scoreBytes = append(scoreBytes,score.FillBytes(buf)...)
  }
  noticePayload,err := scoreNoticeCodec.Encode([]interface{}{replay.CartridgeId,replay.UserAddress,replay.SubmittedAt,finished,resultCard,len(scores),scoreBytes})
  if err != nil {
    return fmt.Errorf("noticeVerifyReplay: encoding notice: %s", err)
  }
  _, err = rollups.SendNotice(&rollups.Notice{noticePayload})
  if err != nil {
    return fmt.Errorf("noticeVerifyReplay: error making http request: %s", err)
  }

  return nil
}

func reportCartridgeNotFound() error {
  messageJson,err := json.Marshal(struct{
    Status model.Status           `json:"status"`
  }{model.CartridgeNotFound})
  if err != nil {
    return fmt.Errorf("reportCartridgeNotFound: creating message: %s", err)
  }

  report := rollups.Report{rollups.Str2Hex(string(messageJson))}
  _, err = rollups.SendReport(&report)
  if err != nil {
    return fmt.Errorf("reportCartridgeNotFound: error making http request: %s", err)
  }

  return fmt.Errorf("reportCartridgeNotFound")
}

func reportResultHashError() error {
  messageJson,err := json.Marshal(struct{
    Status model.Status           `json:"status"`
  }{model.ResultHashMismatch})
  if err != nil {
    return fmt.Errorf("reportResultHashError: creating message: %s", err)
  }

  report := rollups.Report{rollups.Str2Hex(string(messageJson))}
  _, err = rollups.SendReport(&report)
  if err != nil {
    return fmt.Errorf("reportResultHashError: error making http request: %s", err)
  }

  return fmt.Errorf("reportResultHashError")
}

func reportExecutionError(execErr error) error {
  messageJson,err := json.Marshal(struct{
    Status model.Status           `json:"status"`
  }{model.RuntimeError})
  if err != nil {
    return fmt.Errorf("reportExecutionError: creating message: %s", err)
  }

  report := rollups.Report{rollups.Str2Hex(string(messageJson))}
  _, err = rollups.SendReport(&report)
  if err != nil {
    return fmt.Errorf("reportExecutionError: error making http request: %s", err)
  }

  return fmt.Errorf("reportExecutionError")
}

func reportUnauthorizedUser() error {
  messageJson,err := json.Marshal(struct{
    Status model.Status           `json:"status"`
  }{model.UnauthorizedUser})
  if err != nil {
    return fmt.Errorf("reportUnauthorizedUser: creating message: %s", err)
  }

  report := rollups.Report{rollups.Str2Hex(string(messageJson))}
  _, err = rollups.SendReport(&report)
  if err != nil {
    return fmt.Errorf("reportUnauthorizedUser: error making http request: %s", err)
  }

  return fmt.Errorf("reportUnauthorizedUser")
}

//
// Cartridge Inspect
//

func GetCartridgeList(payloadMap map[string]interface{}) error {
  infolog.Println("GetCartridgeList: payload:",payloadMap)

  cartridgeList := make([]*model.Cartridge,0)

  for _,cartridge := range cartridges {
    cartridgeList = append(cartridgeList,cartridge)
  }

  listJson, err := json.Marshal(cartridgeList)
  if err != nil {
    return err
  }

  sentBytes := 0
  for sentBytes < len(listJson) {
    topBytes := sentBytes + maxReportBytes
    if topBytes > len(listJson) {
      topBytes = len(listJson)
    }
    report := rollups.Report{rollups.Bin2Hex(listJson[sentBytes:topBytes])}
    _, err = rollups.SendReport(&report)
    if err != nil {
      return fmt.Errorf("GetCartridgeList: error making http request: %s", err)
    }
    sentBytes = topBytes
  }

  return nil
}

func GetCartridgeInfo(payloadMap map[string]interface{}) error {
  infolog.Println("GetCartridgeInfo: payload:",payloadMap)

  cartridgeId, ok1 := payloadMap["id"].(string)

  if !ok1 {
    return fmt.Errorf("GetCartridgeInfo: parameters error")
  }

  if cartridges[cartridgeId] == nil {
    return fmt.Errorf("GetCartridgeInfo: game not found")
  }

  cartridgeInfo, err := json.Marshal(cartridges[cartridgeId])
  if err != nil {
    return err
  }

  report := rollups.Report{rollups.Str2Hex(string(cartridgeInfo))}
  _, err = rollups.SendReport(&report)
  if err != nil {
    return fmt.Errorf("GetCartridgeInfo: error making http request: %s", err)
  }

  return nil
}

func GetCartridge(payloadMap map[string]interface{}) error {
  infolog.Println("GetCartridge: payload:",payloadMap)

  cartridgeId, ok1 := payloadMap["id"].(string)

  if !ok1 {
    return fmt.Errorf("GetCartridge: parameters error")
  }

  if cartridges[cartridgeId] == nil {
    return reportCartridgeNotFound()
  }

  fileBytes, err := ioutil.ReadFile("cartridges/" + string(cartridgeId))
  if err != nil {
    return fmt.Errorf("GetCartridge: error opening file %s: %s", cartridgesPath + string(cartridgeId), err)
  }

  sentBytes := 0
  for sentBytes < len(fileBytes) {
    topBytes := sentBytes + maxReportBytes
    if topBytes > len(fileBytes) {
      topBytes = len(fileBytes)
    }
    report := rollups.Report{rollups.Bin2Hex(fileBytes[sentBytes:topBytes])}
    _, err := rollups.SendReport(&report)
    if err != nil {
      return fmt.Errorf("GetCartridge: error making http request: %s", err)
    }
    sentBytes = topBytes
  }

  return nil
}

func GetUploadStatus(payloadMap map[string]interface{}) error {
  infolog.Println("GetUploadStatus: payload:",payloadMap)

  name, ok1 := payloadMap["name"].(string)

  if !ok1 {
    return fmt.Errorf("GetUploadStatus: parameters error")
  }

  if cartridgeUploads[name] == nil {
    return fmt.Errorf("GetUploadStatus: Cartridge not present")
  }

  cartridgeJson, err := json.Marshal(cartridgeUploads[name])
  if err != nil {
    return err
  }

  report := rollups.Report{rollups.Str2Hex(string(cartridgeJson))}
  _, err = rollups.SendReport(&report)
  if err != nil {
    return fmt.Errorf("GetUploadStatus: error making http request: %s", err)
  }

  return nil
}


//
// Wasm Inspect
//

func GetWasm(payloadMap map[string]interface{}) error {
  infolog.Println("Got wasm request")
  files, err := ioutil.ReadDir(".")
  if err != nil {
    return fmt.Errorf("GetWasm: %s", err)
  }

  validFile, err := regexp.Compile(`^.+\.wasm$`)
  if err != nil {
    return fmt.Errorf("GetWasm: Error reading wasm files: %s", err)
  }

  for _, file := range files {
    if !file.IsDir() && validFile.MatchString(file.Name()) {
      infolog.Println("Found file",file.Name())

      fileBytes, err := ioutil.ReadFile(file.Name())
      if err != nil {
        return fmt.Errorf("GetWasm: error opening file %s: %s", file.Name(), err)
      }

      sentBytes := 0
      for sentBytes < len(fileBytes) {
        topBytes := sentBytes + maxReportBytes
        if topBytes > len(fileBytes) {
          topBytes = len(fileBytes)
        }
        report := rollups.Report{rollups.Bin2Hex(fileBytes[sentBytes:topBytes])}
        _, err := rollups.SendReport(&report)
        if err != nil {
          return fmt.Errorf("GetWasm: error making http request: %s", err)
        }
        sentBytes = topBytes
      }

      // report := rollups.Report{rollups.Bin2Hex(fileBytes)}
      // res, err := rollups.SendReport(&report)
      // if err != nil {
      //   return fmt.Errorf("ShowClaim: error making http request: %s", err)
      // }
      // infolog.Println("Received report status", strconv.Itoa(res.StatusCode))
    }
  }
  return nil
}


//
// Cartridge
//

func HandleCartridgeSubmit(metadata *rollups.Metadata, payloadMap map[string]interface{}) error {
  // infolog.Println("HandleCartridgeSubmit: payload:",payloadMap)

  name, ok1 := payloadMap["name"].(string)
  bin, ok2 := payloadMap["bin"].([]byte)

  if !ok1 || !ok2 {
    message := "HandleCartridgeSubmit: parameters error "
    report := rollups.Report{rollups.Str2Hex(message)}
    _, err := rollups.SendReport(&report)
    if err != nil {
      return fmt.Errorf("HandleCartridgeSubmit: error making http request: %s", err)
    }
    return fmt.Errorf(message)
  }

  cartridge := &model.Cartridge{Name: name, CreatedAt: metadata.Timestamp, UserAddress: metadata.MsgSender}
  return SaveCartridgeCartridge(cartridge,bin)
}

func HandleCartridgeChunkSubmit(metadata *rollups.Metadata, payloadMap map[string]interface{}) error {
  // infolog.Println("HandleCartridgeChunkSubmit: payload:",payloadMap)
  infolog.Println("HandleCartridgeChunkSubmit: payload length:",len(payloadMap))

  name, ok1 := payloadMap["name"].(string)
  bin, ok2 := payloadMap["bin"].([]byte)

  if !ok1 || !ok2 {
    message := "HandleCartridgeChunkSubmit: parameters error "
    report := rollups.Report{rollups.Str2Hex(message)}
    _, err := rollups.SendReport(&report)
    if err != nil {
      return fmt.Errorf("HandleCartridgeChunkSubmit: error making http request: %s", err)
    }
    return fmt.Errorf(message)
  }

  if cartridgeUploads[name] == nil {
    cartridgeUploads[name] = &model.Cartridge{Name: name, CreatedAt: metadata.Timestamp, UserAddress: metadata.MsgSender}
  }
  cartridge := cartridgeUploads[name]

  if cartridge.DataChunks == nil {
    cartridge.DataChunks = &model.DataChunks{ChunksData:make(map[uint32]*model.Chunk)}
  }

  err := processor.UpdateDataChunks(cartridge.DataChunks,bin)
  if err != nil {
    return fmt.Errorf("HandleCartridgeChunkSubmit: Error updating data chunks: %s",err)
  }

  if uint32(len(cartridge.DataChunks.ChunksData)) == cartridge.DataChunks.TotalChunks {
    composed,err := processor.ComposeDataFromChunks(cartridge.DataChunks)
    if err != nil {
      return fmt.Errorf("HandleCartridgeChunkSubmit: Error composing data chunks: %s",err)
    }
    cartridge.DataChunks = nil
    delete(cartridgeUploads,name)

    return SaveCartridgeCartridge(cartridge, composed)
  }
  return nil
}

func SaveCartridgeCartridge(cartridge *model.Cartridge, bin []byte) error {
  cartridge.Id = processor.GenerateCartridgeId(bin)
  infolog.Println("SaveCartridgeCartridge: Saving",cartridge.Name,"with",len(bin),"bytes")

  if cartridges[cartridge.Id] != nil {
    return fmt.Errorf("SaveCartridgeCartridge: Cartridge already installed")
  }

  cartridges[cartridge.Id] = cartridge

  f, err := os.Create(cartridgesPath + cartridge.Id)
  if err != nil {
    return fmt.Errorf("SaveCartridgeCartridge: creating file: %s", err)
  }
  defer f.Close()

  _,err = f.Write(bin)
  if err != nil {
    return fmt.Errorf("SaveCartridgeCartridge: creating file: %s", err)
  }

  err = os.Chmod(cartridgesPath + cartridge.Id, 0700)
  if err != nil {
    return fmt.Errorf("SaveCartridgeCartridge: changing permissions file: %s", err)
  }

  return reportSuccess(cartridge.Id)
}

//
// Cartridge Card (extra params)
//

func HandleEditCartridgeCard(metadata *rollups.Metadata, payloadMap map[string]interface{}) error {
  // infolog.Println("HandleCartridgeSubmit: payload:",payloadMap)
  infolog.Println("HandleCartridgeSubmit: payload length:",len(payloadMap))

  cartridgeId, ok1 := payloadMap["id"].(string)
  bin, ok2 := payloadMap["bin"].([]byte)

  if !ok1 || !ok2 {
    message := "HandleEditCartridgeCard: parameters error "
    report := rollups.Report{rollups.Str2Hex(message)}
    _, err := rollups.SendReport(&report)
    if err != nil {
      return fmt.Errorf("HandleEditCartridgeCard: error making http request: %s", err)
    }
    return fmt.Errorf(message)
  }

  if cartridges[cartridgeId] == nil {
    return reportCartridgeNotFound()
  }
  cartridge := cartridges[cartridgeId]

  if metadata.MsgSender != cartridge.UserAddress {
    return reportUnauthorizedUser()
  }

  return EditCartridgeCard(cartridge,bin)
}

func HandleEditCartridgeCardChunk(metadata *rollups.Metadata, payloadMap map[string]interface{}) error {
  // infolog.Println("HandleEditCartridgeCardChunk: payload:",payloadMap)
  infolog.Println("HandleEditCartridgeCardChunk: payload length:",len(payloadMap))

  cartridgeId, ok1 := payloadMap["id"].(string)
  bin, ok2 := payloadMap["bin"].([]byte)

  if !ok1 || !ok2 {
    message := "HandleEditCartridgeCardChunk: parameters error "
    report := rollups.Report{rollups.Str2Hex(message)}
    _, err := rollups.SendReport(&report)
    if err != nil {
      return fmt.Errorf("HandleEditCartridgeCardChunk: error making http request: %s", err)
    }
    return fmt.Errorf(message)
  }

  if cartridges[cartridgeId] == nil {
    return reportCartridgeNotFound()
  }
  cartridge := cartridges[cartridgeId]

  err := processor.UpdateDataChunks(cartridge.DataChunks,bin)
  if err != nil {
    return fmt.Errorf("HandleEditCartridgeCardChunk: Error updating data chunks: %s",err)
  }

  if uint32(len(cartridge.DataChunks.ChunksData)) == cartridge.DataChunks.TotalChunks {
    composed,err := processor.ComposeDataFromChunks(cartridge.DataChunks)
    if err != nil {
      return fmt.Errorf("HandleEditCartridgeCardChunk: Error composing data chunks: %s",err)
    }
    cartridge.DataChunks = nil

    return EditCartridgeCard(cartridge, composed)
  }
  return nil
}

func EditCartridgeCard(cartridge *model.Cartridge, bin []byte) error {
  cartridge.Card = bin
  infolog.Println("EditCartridgeCard: Saving",cartridge.Name,"card with",len(bin),"bytes")
  return reportSuccess(cartridge.Id)
}


//
// Remove
//

func HandleRemove(metadata *rollups.Metadata, payloadMap map[string]interface{}) error {
  infolog.Println("HandleRemove: payload:",payloadMap)

  cartridgeId, ok1 := payloadMap["id"].(string)

  if !ok1 {
    message := "HandleRemove: parameters error "
    report := rollups.Report{rollups.Str2Hex(message)}
    _, err := rollups.SendReport(&report)
    if err != nil {
      return fmt.Errorf("HandleRemove: error making http request: %s", err)
    }
    return fmt.Errorf(message)
  }

  if cartridges[cartridgeId] == nil {
    return reportCartridgeNotFound()
  }

  err := os.Remove(cartridgesPath + cartridgeId)
  if err != nil {
    return fmt.Errorf("HandleRemove: Error removing file: %s",err)
  }
  delete(cartridges,cartridgeId)

  return reportSuccess(cartridgeId)
}

//
// Replay
//

func HandleReplay(metadata *rollups.Metadata, payloadMap map[string]interface{}) error {
  infolog.Println("HandleReplay: payload:",payloadMap)

  cartridgeId, ok1 := payloadMap["id"].(string)
  args, ok2 := payloadMap["args"].(string)
  bin, ok3 := payloadMap["bin"].([]byte)
  card, ok4 := payloadMap["card"].([]byte)
  resultHash, ok5 := payloadMap["resultHash"].([]byte)

  if !ok1 || !ok2 || !ok3 || !ok4 || !ok5 {
    message := "HandleReplay: parameters error "
    report := rollups.Report{rollups.Str2Hex(message)}
    _, err := rollups.SendReport(&report)
    if err != nil {
      return fmt.Errorf("HandleReplay: error making http request: %s", err)
    }
    return fmt.Errorf(message)
  }

  if cartridges[cartridgeId] == nil {
    return reportCartridgeNotFound()
  }

  replay := &model.Replay{CartridgeId: cartridgeId, SubmittedAt: metadata.Timestamp, UserAddress: metadata.MsgSender, Args: args, ResultHash: resultHash, Card: card}
  return ProcesReplay(replay, bin)
}

func HandleReplayChunk(metadata *rollups.Metadata, payloadMap map[string]interface{}) error {
  infolog.Println("HandleReplayChunk: payload:",payloadMap)

  cartridgeId, ok1 := payloadMap["id"].(string)
  args, ok2 := payloadMap["args"].(string)
  bin, ok3 := payloadMap["bin"].([]byte)
  card, ok4 := payloadMap["card"].([]byte)
  resultHash, ok5 := payloadMap["resultHash"].([]byte)

  if !ok1 || !ok2 || !ok3 || !ok4 || !ok5 {
    message := "HandleReplayChunk: parameters error "
    report := rollups.Report{rollups.Str2Hex(message)}
    _, err := rollups.SendReport(&report)
    if err != nil {
      return fmt.Errorf("HandleReplayChunk: error making http request: %s", err)
    }
    return fmt.Errorf(message)
  }

  if cartridges[cartridgeId] == nil {
    return reportCartridgeNotFound()
  }

  replayId := metadata.MsgSender + cartridgeId

  // Check if cartridge
  if replayUploads[replayId] == nil {
    replayUploads[replayId] = &model.Replay{CartridgeId: cartridgeId, SubmittedAt: metadata.Timestamp, UserAddress: metadata.MsgSender, Args: args, ResultHash: resultHash, Card: card}
  }
  replay := replayUploads[replayId]

  if replay.DataChunks == nil {
    replay.DataChunks = &model.DataChunks{ChunksData:make(map[uint32]*model.Chunk)}
  }

  err := processor.UpdateDataChunks(replay.DataChunks,bin)
  if err != nil {
    return fmt.Errorf("HandleReplayChunk: Error updating data chunks: %s",err)
  }

  if uint32(len(replay.DataChunks.ChunksData)) == replay.DataChunks.TotalChunks {
    composed,err := processor.ComposeDataFromChunks(replay.DataChunks)
    if err != nil {
      return fmt.Errorf("HandleReplayChunk: Error composing data chunks: %s",err)
    }
    replay.DataChunks = nil
    delete(replayUploads, replayId)

    return ProcesReplay(replay, composed)
  }
  return nil
}

func ProcesReplay(replay *model.Replay, bin []byte) error {

  f, err := os.Create(cartridgesPath + replay.CartridgeId + ".data")
  if err != nil {
    return fmt.Errorf("ProcesReplay: creating file: %s", err)
  }
  defer f.Close()

  _,err = f.Write(bin)
  if err != nil {
    return fmt.Errorf("ProcesReplay: creating file: %s", err)
  }

  args := make([]string,0,2)
  if replay.Args != "" {
    args = append(args,replay.Args)
  }
  args = append(args,replay.CartridgeId + ".data")

  cmd := exec.Command("./"+replay.CartridgeId, args...)
  cmd.Dir = cartridgesPath
  out, err := cmd.CombinedOutput() // stdout, err
  if err != nil {
    infolog.Println(string(out))
    return reportExecutionError(err)
  }

  scoreBytes, err := ioutil.ReadFile(scorefilename)
  if err != nil {
    return fmt.Errorf("ProcesReplay: reading file: %s", err)
  }

  scoreBytesHash := sha256.Sum256(scoreBytes)
  var resultHash [32]byte
  copy(resultHash[:],replay.ResultHash[:])
  if scoreBytesHash != resultHash {
    return reportResultHashError()
  }

  scores := make([]*big.Int,0)
  for _,scoreStr := range strings.Split(string(scoreBytes),",") {
    n := new(big.Int)
    n, okInt := n.SetString(scoreStr, 10)
    if !okInt {
      return fmt.Errorf("ProcesReplay: coverting score : %s", n)
    }
    scores = append(scores,n)
  }

  err = os.Remove(cartridgesPath + replay.CartridgeId + ".data")
  if err != nil {
    return fmt.Errorf("ProcesReplay: removing replay file: %s", err)
  }

  return noticeVerifyReplay(replay,true,"",scores)
}


// default route

func HandleWrongWay(payloadHex string) error {
  message := "Unrecognized input, you should send a valid input"
  report := rollups.Report{rollups.Str2Hex(message)}
  _, err := rollups.SendReport(&report)
  if err != nil {
    return fmt.Errorf("HandleWrongWay: error making http request: %s", err)
  }
  return fmt.Errorf(message)
}

func main() {
  developerAddress, err := abihandler.Hex2Address("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266") // test wallet #0
  if err != nil {
    panic(err)
  }

  maxReportBytes = 500000
  cartridges = make(map[string]*model.Cartridge)
  // cartridges["e7e2a65711cc38c264252b7224066b37a1193233712527a3cdec6bb97ee11cd1"] = &model.Cartridge{Name: "test", Id: "e7e2a65711cc38c264252b7224066b37a1193233712527a3cdec6bb97ee11cd1"}
  cartridgeUploads = make(map[string]*model.Cartridge)

  scorefilename = "cartridges/score"
  cartridgesPath = "cartridges/"
  newpath := filepath.Join(".", "cartridges")
  err = os.MkdirAll(newpath, os.ModePerm)
  if err != nil {
    log.Panicln(err)
  }

  handler := abihandler.NewAbiHandler()
  // handler.SetDebug()

  // scoreNoticeCodec = abihandler.NewCodec([]string{"string","address","uint64","bool","string","uint[]"}) // id, player, ts, finished, result_card, scores
  scoreNoticeCodec = abihandler.NewCodec([]string{"string","address","uint64","bool","string","uint","bytes"}) // id, player, ts, finished, result_card, scoreslen, scoresbytes

  handler.HandleAdvanceRoute(abihandler.NewHeaderCodec("riv","addCartridge",[]string{"string name","bytes bin"}), HandleCartridgeSubmit)
  handler.HandleAdvanceRoute(abihandler.NewHeaderCodec("riv","addCartridgeChunk",[]string{"string name","bytes bin"}), HandleCartridgeChunkSubmit)
  handler.HandleAdvanceRoute(abihandler.NewHeaderCodec("riv","editCartridgeCard",[]string{"string id","bytes bin"}), HandleEditCartridgeCard)
  handler.HandleAdvanceRoute(abihandler.NewHeaderCodec("riv","editCartridgeCardChunk",[]string{"string id","bytes bin"}), HandleEditCartridgeCardChunk)
  handler.HandleFixedAddressAdvance(abihandler.Address2Hex(developerAddress),abihandler.NewHeaderCodec("riv","removeCartridge",[]string{"string id"}), HandleRemove)
  handler.HandleAdvanceRoute(abihandler.NewHeaderCodec("riv","verifyReplay",[]string{"string id","bytes resultHash","string args","bytes card","bytes bin"}), HandleReplay)
  handler.HandleAdvanceRoute(abihandler.NewHeaderCodec("riv","verifyReplayChunk",[]string{"string id","bytes resultHash","string args","bytes card","bytes bin"}), HandleReplayChunk)

  handler.HandleDefault(HandleWrongWay)

  uriHandler := urihandler.AddUriHandler(handler.Handler)
  uriHandler.HandleInspectRoute("wasm", GetWasm)
  uriHandler.HandleInspectRoute("cartridges", GetCartridgeList)
  uriHandler.HandleInspectRoute("cartridges/:id", GetCartridgeInfo)         // id is string hash of cartridge
  uriHandler.HandleInspectRoute("cartridges/:id/cartridge", GetCartridge)   // id is string hash of cartridge
  uriHandler.HandleInspectRoute("cartridges/upload/:name", GetUploadStatus) // chunk upload status

  err = handler.Run()
  if err != nil {
    log.Panicln(err)
  }
}
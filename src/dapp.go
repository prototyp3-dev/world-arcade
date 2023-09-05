package main

import (
  "fmt"
  "log"
  "os"
  "strconv"
  "io/ioutil"
  "encoding/json"
  "regexp"
  "os/exec"
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

var noticeVerifyCodec *abihandler.Codec

const cartridgesPath string = "/rivos/cartridges/"
const maxReportBytes int = 500000
const developerAddressHex string = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" // test wallet #0

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

func noticeVerifyReplay(replay *model.Replay, outCardValid bool, outCard string) error {
  noticePayload,err := noticeVerifyCodec.Encode([]interface{}{replay.CartridgeId,replay.UserAddress,replay.SubmittedAt,outCardValid,outCard})
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

  fileBytes, err := ioutil.ReadFile(cartridgesPath + string(cartridgeId))
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

  id, ok1 := payloadMap["id"].(string)

  if !ok1 {
    return fmt.Errorf("GetUploadStatus: parameters error")
  }

  if cartridgeUploads[id] == nil {
    return fmt.Errorf("GetUploadStatus: Cartridge not present")
  }

  cartridgeJson, err := json.Marshal(cartridgeUploads[id])
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
  infolog.Println("HandleCartridgeChunkSubmit: payload length:",len(payloadMap))

  _, ok1 := payloadMap["id"].(string)
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

  cartridge := &model.Cartridge{CreatedAt: metadata.Timestamp, UserAddress: metadata.MsgSender}
  return SaveCartridgeCartridge(cartridge,bin)
}

func HandleCartridgeChunkSubmit(metadata *rollups.Metadata, payloadMap map[string]interface{}) error {
  infolog.Println("HandleCartridgeChunkSubmit: payload length:",len(payloadMap))

  id, ok1 := payloadMap["id"].(string)
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

  cartridgeUploadId := metadata.MsgSender + id

  if cartridgeUploads[cartridgeUploadId] == nil {
    cartridgeUploads[cartridgeUploadId] = &model.Cartridge{CreatedAt: metadata.Timestamp, UserAddress: metadata.MsgSender}
  }
  cartridge := cartridgeUploads[cartridgeUploadId]

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
    delete(cartridgeUploads,cartridgeUploadId)

    return SaveCartridgeCartridge(cartridge, composed)
  }
  return nil
}

func SaveCartridgeCartridge(cartridge *model.Cartridge, bin []byte) error {
  // Determine cartridge id
  cartridge.Id = processor.GenerateCartridgeId(bin)
  if cartridges[cartridge.Id] != nil {
    return fmt.Errorf("SaveCartridgeCartridge: Cartridge %s is already installed", cartridge.Id)
  }

  // Store cartridge
  err := os.WriteFile(cartridgesPath + cartridge.Id, bin, os.ModePerm)
  if err != nil {
    return fmt.Errorf("SaveCartridgeCartridge: Error writing file: %s", err)
  }

  // Use the first frame screenshot as cover
  cartridge.Cover, _ = GetCartridgeScreenshot(cartridge.Id, 0)

  // Get information
  cartridge.Info, _ = GetCartridgeInfoJSON(cartridge.Id)

  // Print (for debugging)
  infolog.Println("SaveCartridgeCartridge: Saved",cartridge.Id,"with",len(bin),"bytes:")
  infolog.Println(cartridge.Info)
  cartridges[cartridge.Id] = cartridge
  return reportSuccess(cartridge.Id)
}

func GetCartridgeScreenshot(cartridgeId string, frame uint64) ([]byte, error) {
  const screenshotPath = "/run/screenshot"

  // Remove temporary files that may be overwritten
  os.Remove(screenshotPath)

  // Remove temporary files when exiting
  defer os.Remove(screenshotPath)

  // Compose cartridge execute command
  args := make([]string,0)
  args = append(args, "/rivos")
  args = append(args, "--setenv", "RIV_CARTRIDGE", "/cartridges/" + cartridgeId)
  args = append(args, "--setenv", "RIV_SAVE_SCREENSHOT", screenshotPath)
  args = append(args, "--setenv", "RIV_STOP_FRAME", strconv.Itoa(int(frame)))
  args = append(args, "--setenv", "RIV_NO_YIELD", "y")
  args = append(args, "riv-run")

  // Execute command
  infolog.Println("GetCartridgeScreenshot: getting frame screenshot...")
  cmd := exec.Command("riv-chroot", args...)
  out, err := cmd.CombinedOutput()
  infolog.Printf("\n%s",string(out))
  if err != nil {
    infolog.Println("GetCartridgeScreenshot: error generating screenshot:",err)
    return []byte{}, err
  }

  // Read output card
  screenshotBytes, err := ioutil.ReadFile(screenshotPath)
  if err != nil {
    infolog.Println("GetCartridgeScreenshot: error reading screenshot file:", err)
    return []byte{}, err
  }

  return screenshotBytes, nil
}

func GetCartridgeInfoJSON(cartridgeId string) (map[string]interface{}, error) {
  const screenshotPath = "/run/screenshot"

  // Remove temporary files that may be overwritten
  os.Remove(screenshotPath)

  // Remove temporary files when exiting
  defer os.Remove(screenshotPath)

  // Compose info extract command
  args := make([]string,0)
  args = append(args, "/rivos")
  args = append(args, "sqfscat", "-st", "/cartridges/" + cartridgeId, "/info.json")

  // Execute command
  infolog.Println("GetCartridgeInfoJSON: getting cartridge info...")
  cmd := exec.Command("riv-chroot", args...)
  out, err := cmd.Output()

  // Cartridge has no information?
  info := map[string]interface{}{}
  if err != nil {
    infolog.Println("GetCartridgeInfoJSON: error executing command:",err)
    return info, err
  }

  // Parse information json
  err = json.Unmarshal(out, &info)
  if err != nil {
    infolog.Println("GetCartridgeInfoJSON: error parsing info:",err)
    return info, err
  }

  return info, nil
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
  inCard, ok4 := payloadMap["inCard"].([]byte)
  outCardHash, ok5 := payloadMap["outCardHash"].([]byte)

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

  replay := &model.Replay{CartridgeId: cartridgeId, SubmittedAt: metadata.Timestamp, UserAddress: metadata.MsgSender, Args: args, OutCardHash: outCardHash, InCard: inCard}
  return ProcesReplay(replay, bin)
}

func HandleReplayChunk(metadata *rollups.Metadata, payloadMap map[string]interface{}) error {
  infolog.Println("HandleReplayChunk: payload:",payloadMap)

  cartridgeId, ok1 := payloadMap["id"].(string)
  args, ok2 := payloadMap["args"].(string)
  bin, ok3 := payloadMap["bin"].([]byte)
  inCard, ok4 := payloadMap["inCard"].([]byte)
  outCardHash, ok5 := payloadMap["outCardHash"].([]byte)

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

  replayUploadId := metadata.MsgSender + cartridgeId + args + string(inCard) + string(outCardHash)

  // Check if cartridge
  if replayUploads[replayUploadId] == nil {
    replayUploads[replayUploadId] = &model.Replay{CartridgeId: cartridgeId, SubmittedAt: metadata.Timestamp, UserAddress: metadata.MsgSender, Args: args, OutCardHash: outCardHash, InCard: inCard}
  }
  replay := replayUploads[replayUploadId]

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
    delete(replayUploads, replayUploadId)

    return ProcesReplay(replay, composed)
  }
  return nil
}

func ProcesReplay(replay *model.Replay, bin []byte) error {
  const outcardPath = "/run/outcard"
  const replayPath = "/run/replaylog"

  // Remove temporary files that may be overwritten
  os.Remove(replayPath)
  os.Remove(outcardPath)

  // Remove temporary files when exiting
  defer os.Remove(replayPath)
  defer os.Remove(outcardPath)

  // Write replay to a file
  err := os.WriteFile(replayPath, bin, os.ModePerm)
  if err != nil {
    return fmt.Errorf("ProcesReplay: writing replay file: %s", err)
  }

  // Compose cartridge execute command
  args := make([]string,0)
  args = append(args, "/rivos")
  args = append(args, "--setenv", "RIV_CARTRIDGE", "/cartridges/" + replay.CartridgeId)
  args = append(args, "--setenv", "RIV_REPLAYLOG", replayPath)
  args = append(args, "--setenv", "RIV_OUTCARD", outcardPath)
  args = append(args, "--setenv", "RIV_NO_YIELD", "y")
  args = append(args, "riv-run")
  if replay.Args != "" {
    args = append(args, replay.Args)
  }

  // Execute command
  infolog.Println("ProcesReplay: replaying cartridge...")
  cmd := exec.Command("riv-chroot", args...)
  out, err := cmd.CombinedOutput()
  infolog.Printf("\n%s",string(out))
  if err != nil {
    infolog.Println("Error:",err)
    return reportExecutionError(err)
  }

  // Read output card
  outCardBytes, err := ioutil.ReadFile(outcardPath)
  if err != nil {
    return fmt.Errorf("ProcesReplay: reading outcard file: %s", err)
  }

  outCardString := string(outCardBytes)

  // Verify output card hash
  outCardHash := sha256.Sum256(outCardBytes)
  var outCardExpectedHash [32]byte
  copy(outCardExpectedHash[:],replay.OutCardHash[:])
  outCardValid := outCardHash == outCardExpectedHash

  // Print outcard information (for debugging)
  outCardFormat := outCardString[0 : 4]
  infolog.Printf("==== BEGIN OUTCARD (%s) ====\n", outCardFormat)
  if outCardFormat == "JSON" || outCardFormat == "TEXT" {
    infolog.Println(outCardString[4:])
  } else {
    infolog.Printf("%x\n", outCardString[4:])
  }
  infolog.Println("==== END OUTCARD ====")
  infolog.Printf("Expected Outcard Hash: %x\n", outCardHash)
  infolog.Printf("Computed Outcard Hash: %x\n", outCardExpectedHash)
  infolog.Printf("Valid Outcard Hash : %t\n", outCardValid)

  return noticeVerifyReplay(replay, outCardValid, outCardString)
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
  developerAddress, err := abihandler.Hex2Address(developerAddressHex)
  if err != nil {
    log.Panicln(err)
  }

  cartridges = make(map[string]*model.Cartridge)
  cartridgeUploads = make(map[string]*model.Cartridge)

  handler := abihandler.NewAbiHandler()
  // handler.SetDebug()

  noticeVerifyCodec = abihandler.NewCodec([]string{"string","address","uint64","bool","string"}) // id, player, timestamp, valid, outcard

  handler.HandleAdvanceRoute(abihandler.NewHeaderCodec("riv","addCartridge",[]string{"string id", "bytes bin"}), HandleCartridgeSubmit)
  handler.HandleAdvanceRoute(abihandler.NewHeaderCodec("riv","addCartridgeChunk",[]string{"string id", "bytes bin"}), HandleCartridgeChunkSubmit)
  handler.HandleFixedAddressAdvance(abihandler.Address2Hex(developerAddress),abihandler.NewHeaderCodec("riv","removeCartridge",[]string{"string id"}), HandleRemove)
  handler.HandleAdvanceRoute(abihandler.NewHeaderCodec("riv","verifyReplay",[]string{"string id","bytes outCardHash","string args","bytes inCard","bytes bin"}), HandleReplay)
  handler.HandleAdvanceRoute(abihandler.NewHeaderCodec("riv","verifyReplayChunk",[]string{"string id","bytes outCardHash","string args","bytes inCard","bytes bin"}), HandleReplayChunk)

  handler.HandleDefault(HandleWrongWay)

  uriHandler := urihandler.AddUriHandler(handler.Handler)
  uriHandler.HandleInspectRoute("wasm", GetWasm)
  uriHandler.HandleInspectRoute("cartridges", GetCartridgeList)
  uriHandler.HandleInspectRoute("cartridges/:id", GetCartridgeInfo)         // id is string hash of cartridge
  uriHandler.HandleInspectRoute("cartridges/:id/cartridge", GetCartridge)   // id is string hash of cartridge
  uriHandler.HandleInspectRoute("cartridges/upload/:id", GetUploadStatus) // chunk upload status

  err = handler.Run()
  if err != nil {
    log.Panicln(err)
  }
}
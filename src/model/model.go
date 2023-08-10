package model

import (
  "fmt"
  "encoding/json"
  "github.com/prototyp3-dev/go-rollups/rollups"
)

type Cartridge struct {
  Id string               `json:"id"`
  Name string             `json:"name"`
  UserAddress string      `json:"userAddress"`
  CreatedAt uint64        `json:"lastEdited"`
  Card []byte             `json:"card"`
  DataChunks *DataChunks  `json:"dataChunks"`
}
func (c Cartridge) MarshalJSON() ([]byte, error) {
  return json.Marshal(struct{
    Id string               `json:"id"`
    Name string             `json:"name"`
    UserAddress string      `json:"userAddress"`
    CreatedAt uint64        `json:"createdAt"`
    Card string             `json:"card"`
  }{c.Id,c.Name,c.UserAddress,c.CreatedAt,rollups.Bin2Hex(c.Card)})
}


type Replay struct {
  CartridgeId string      `json:"cartridgeId"`
  UserAddress string      `json:"userAddress"`
  SubmittedAt uint64      `json:"submittedAt"`
  Args string             `json:"args"`
  ResultHash []byte       `json:"resultHash"`
  Card []byte             `json:"card"`
  DataChunks *DataChunks  `json:"dataChunks"`
}

type DataChunks struct {
  ChunksData map[uint32]*Chunk
  TotalChunks uint32
}
func (dc DataChunks) MarshalJSON() ([]byte, error) {
  var size uint64
  var chunkIndexes []uint32
  for index, chunk := range dc.ChunksData {
    size += uint64(len(chunk.Data))
    chunkIndexes = append(chunkIndexes,index)
  }
  return json.Marshal(struct{
    TotalChunks uint32            `json:"totalChunks"`
    CurrentSize uint64            `json:"size"`
    Chunks []uint32               `json:"chunks"`
  }{TotalChunks:dc.TotalChunks,CurrentSize:size,Chunks:chunkIndexes})
}

type Chunk struct {
  Data []byte
}
func (c Chunk) String() string {
  return fmt.Sprintf("%db",len(c.Data))
}

type Status uint8

const (
  Success Status = iota
  ResultHashMismatch
  CartridgeNotFound
  CpuTimeExceeded
  Killed
  RuntimeError
  UnauthorizedUser
)

func (s Status) String() string {
	statuses := [...]string{"STATUS_SUCCESS","STATUS_RESULT_HASH_MISMATCH","STATUS_CARTRIDGE_NOT_FOUND",
            "STATUS_CPU_TIME_EXCEEDED","STATUS_KILLED","STATUS_RUNTIME_ERROR","STATUS_UNAUTHORIZED_USER"}
	if len(statuses) < int(s) {
		return "STATUS_UNKNOWN"
	}
	return statuses[s]
}

func (s Status) MarshalJSON() ([]byte, error) {
  return json.Marshal(s.String())
}
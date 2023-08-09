package processor

import (
  "io"
  "fmt"
	"bytes"
	"encoding/binary"
	"encoding/hex"
	"compress/gzip"
  "dapp/model"

	"crypto/sha256"
)

func GenerateCartridgeId(bin []byte) string {
	binHash := sha256.Sum256(bin)
	cartridgeId := make([]byte,32)
	copy(cartridgeId[:],binHash[:])

  return hex.EncodeToString(cartridgeId)
}

func CompressData(data []byte) ([]byte,error) {
  var buf bytes.Buffer
  zw := gzip.NewWriter(&buf)

  _, err := zw.Write(data)
  if err != nil {
    return buf.Bytes(), fmt.Errorf("CompressData: error compressing data: %s", err)
  }
  if err := zw.Close(); err != nil {
    return buf.Bytes(), fmt.Errorf("CompressData: error closing writer: %s", err)
  }
  return buf.Bytes(), nil
}

func DecompressData(data []byte) ([]byte,error) {
  buf := bytes.NewBuffer(data)
  var bufOut bytes.Buffer

  zr, err := gzip.NewReader(buf)
  if err != nil {
    return bufOut.Bytes(), fmt.Errorf("DecompressData: error decompressing data: %s", err)
  }

  if _, err := io.Copy(&bufOut, zr); err != nil {
    return bufOut.Bytes(), fmt.Errorf("DecompressData: error copying data to out bufer: %s", err)
  }
  if err := zr.Close(); err != nil {
    return bufOut.Bytes(), fmt.Errorf("DecompressData: error closing reader: %s", err)
  }
  return bufOut.Bytes(),nil
}

func PrepareDataToSend(data []byte, maxSize uint64) ([]string,error) {
  preparedData := []string{}
	if len(data) < 1 {
		return preparedData,fmt.Errorf("PrepareData: Invalid empty data")
	}
  compressed,err := CompressData(data)
	if err != nil {
		return preparedData,fmt.Errorf("PrepareData: error compressing data: %s", err)
	}
  sizeData := uint64(len(compressed))
  totalChunks := uint32(sizeData/maxSize)
  if sizeData % maxSize == 0 {
    totalChunks -= 1
  }

  totalChunksBytes := make([]byte, 4)
  binary.BigEndian.PutUint32(totalChunksBytes, totalChunks)

  for chunkIndex := uint32(0); chunkIndex <= totalChunks; chunkIndex += 1 {
    chunksIndexBytes := make([]byte, 4)
    binary.BigEndian.PutUint32(chunksIndexBytes, chunkIndex)
    metadata := append(chunksIndexBytes, totalChunksBytes...)
    top := uint64(chunkIndex+1)*(maxSize)
    if top > sizeData {
      top = sizeData
    }
    allData := append(metadata,compressed[uint64(chunkIndex)*maxSize:top]...)

    hx := hex.EncodeToString(allData)
    allDataHex := "0x"+string(hx)
    preparedData = append(preparedData, allDataHex)
  }

  return preparedData,nil
}

func UpdateDataChunks(dataChunks *model.DataChunks, chunk []byte) error {
  chunkIndex := binary.BigEndian.Uint32(chunk[0:4])
  totalChunks := binary.BigEndian.Uint32(chunk[4:8]) + 1
  data := chunk[8:]

  if chunkIndex > totalChunks {
    return fmt.Errorf("UpdateDataChunks: Inconsistent chunk index, greater than total")
  }

  if dataChunks.TotalChunks == 0 {
    dataChunks.ChunksData = make(map[uint32]*model.Chunk)
    dataChunks.TotalChunks = totalChunks
  } else {
    if totalChunks != dataChunks.TotalChunks {
      return fmt.Errorf("UpdateDataChunks: Can't append chunk, Inconsistent number of chunks")
    }
  }
  dataChunks.ChunksData[chunkIndex] = &model.Chunk{Data:data}
  return nil
}

func ComposeDataFromChunks(dataChunks *model.DataChunks) ([]byte,error) {
  var data []byte
  if uint32(len(dataChunks.ChunksData)) != dataChunks.TotalChunks {
    return data,fmt.Errorf("ComposeDataFromChunks: Wrong number of chunks")
  }
  orderedChunks := make([][]byte,dataChunks.TotalChunks)
  for i, chunk := range dataChunks.ChunksData {
    orderedChunks[i] = chunk.Data
  }
  var compressed []byte
  for _, chunkData := range orderedChunks {
    compressed = append(compressed, chunkData...)
  }

  decompressed,err := DecompressData(compressed)
	if err != nil {
		return data,fmt.Errorf("ComposeDataFromChunks: Error decompressing data %s",err)
	}
  return decompressed,nil
}

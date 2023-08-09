package main
import (
    "fmt"
    "os"
    "time"
    "strings"
    "strconv"
	"io/ioutil"
	"math/rand"
	"crypto/aes"
	"crypto/cipher"
	"crypto/sha256"
	"unicode"
)

func Encrypt(bintext , key []byte) []byte {
	block, err := aes.NewCipher(key)
	if err != nil {
		panic(err)
	}

	ciphertext := make([]byte, aes.BlockSize+len(bintext))
	iv := ciphertext[:aes.BlockSize]

	stream := cipher.NewCFBEncrypter(block, iv)
	stream.XORKeyStream(ciphertext[aes.BlockSize:], bintext)

	return ciphertext
}

func Decrypt(ciphertext, key []byte) string {
	block, err := aes.NewCipher(key)
	if err != nil {
		panic(err)
	}

	if len(ciphertext) < aes.BlockSize {
		panic("ciphertext too short")
	}
	iv := ciphertext[:aes.BlockSize]
	ciphertext = ciphertext[aes.BlockSize:]

	stream := cipher.NewCFBDecrypter(block, iv)
	stream.XORKeyStream(ciphertext, ciphertext)
	return string(ciphertext)
}

func TrimIntFunc(r rune) bool {
	return !unicode.IsNumber(r)
}

type mytyp string

func main() {
    args := os.Args

	keyHash := sha256.Sum256([]byte("fdJKHEFL4oier90j́4*@#@kinOIÇD@!#($2kbkmsacjk b43"))
	key := make([]byte,32)
	copy(key[:],keyHash[:])

	if len(args) == 1 {

		fmt.Println("Count seconds up to ... (Press enter)")
		start := time.Now()
		fmt.Scanln()
		t := time.Now()
		elapsed := t.Sub(start)

		rand.Seed(elapsed.Microseconds())
		countTarget := int64(rand.Intn(7)+3)

		fmt.Println(countTarget)
		time.Sleep(1000 * time.Millisecond)
		fmt.Println("(Press enter to stop)")
		time.Sleep(1000 * time.Millisecond)
		fmt.Print("Ready")
		time.Sleep(250 * time.Millisecond)
		fmt.Print(".")
		time.Sleep(250 * time.Millisecond)
		fmt.Print(".")
		time.Sleep(250 * time.Millisecond)
		fmt.Print(".")
		time.Sleep(250 * time.Millisecond)
		fmt.Print(" set")
		time.Sleep(250 * time.Millisecond)
		fmt.Print(".")
		time.Sleep(250 * time.Millisecond)
		fmt.Print(".")
		time.Sleep(250 * time.Millisecond)
		fmt.Print(".")
		time.Sleep(250 * time.Millisecond)
		fmt.Println(" GO!")
		start = time.Now()
		fmt.Scanln()
		t = time.Now()
		elapsed = t.Sub(start)

		microElapsed := elapsed.Microseconds()
		diffMicro := microElapsed - countTarget * int64(1000000)

		var score int64 = 1000000

		if diffMicro < 0 {
			diffMicroAbs := -1 * diffMicro
			if diffMicroAbs > 200000 {
				fmt.Println("Too anxious, you were",diffMicroAbs," microseconds early")
			} else {
				fmt.Println("Very close, you were",diffMicroAbs," microseconds early")
			}
			score -= diffMicroAbs
		} else {
			if diffMicro > 0 {
				if diffMicro > 200000 {
					fmt.Println("Too lazy, you were",diffMicro," microseconds late")
				} else {
					fmt.Println("Very close, you were",diffMicro," microseconds late")
				}
				score -= diffMicro
			} else {
				fmt.Print("Cheater!!! You nailed it!")
				time.Sleep(500 * time.Millisecond)
				fmt.Print(" This is not possible!")
				time.Sleep(500 * time.Millisecond)
				fmt.Println(" You nailed it!")
			}
		}
		if score < 0 {
			score = 0
		}

		plaintext := fmt.Sprintf("%d,%d",countTarget,microElapsed)
		// ciphertext := []byte(plaintext) // Encrypt([]byte(plaintext),key)
		ciphertext := Encrypt([]byte(plaintext),key)

		err := os.WriteFile("log", ciphertext, 0644)
		if err != nil {
			panic(err)
		}

		scoreStr := fmt.Sprintf("%d,%d",score,diffMicro)
		fmt.Println()
		fmt.Println("Score:")
		fmt.Println(scoreStr)

		// scoreBytesHash := sha256.Sum256([]byte(scoreStr))
		
		// fmt.Println()
		// fmt.Println("Score hash:")
		// fmt.Println(scoreBytesHash)

		err = os.WriteFile("score", []byte(scoreStr), 0644)
		if err != nil {
			panic(err)
		}

		time.Sleep(1 * time.Second)
	} else {
		logFilename := args[1]

		logfileBytes, err := ioutil.ReadFile(logFilename)
		if err != nil {
		  panic(err)
		}

		// plaintext := logfileBytes //Decrypt(logfileBytes,key)
		plaintext := Decrypt(logfileBytes,key)

		logline := strings.Split(string(plaintext),",")
		if len(logline) != 2 {
			panic("Wrong logfile format")
		}
		
		countTarget, err := strconv.ParseInt(strings.TrimFunc(logline[0],TrimIntFunc), 10, 64)
		if err != nil {
			panic(err)
		}

		microElapsed, err := strconv.ParseInt(strings.TrimFunc(logline[1],TrimIntFunc), 10, 64)
		if err != nil {
			panic(err)
		}

		diffMicro := microElapsed - countTarget * 1000000

		var score int64 = 1000000

		if diffMicro < 0 {
			diffMicroAbs := -1 * diffMicro
			score -= diffMicroAbs
		} else {
			if diffMicro > 0 {
				score -= diffMicro
			} 
		}
		if score < 0 {
			score = 0
		}

		err = os.WriteFile("score", []byte(fmt.Sprintf("%d,%d",score,diffMicro)), 0644)
		if err != nil {
			panic(err)
		}

	}
}
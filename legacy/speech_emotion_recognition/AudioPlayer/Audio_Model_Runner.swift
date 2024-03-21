//
//  Audio_Custom_Effects.swift
//  AudioPlayer
//
//  Created by basil zinsli on 18.10.23.
//

import Foundation
import AVFoundation
import TensorFlowLite
import CoreML


import TensorFlowLite

class ModelRunner {
    private var interpreter: Interpreter?

    init?(modelPath: String) {
        do {
            // Erstellen eines Interpreters für das Modell
            var options = Interpreter.Options()
            options.threadCount = 1
            self.interpreter = try Interpreter(modelPath: modelPath, options: options)
            // Zuteilung der Tensoren einmalig während der Initialisierung
            try self.interpreter?.allocateTensors()
        } catch let error {
            print("Fehler beim Erstellen des Interpreters: \(error)")
            return nil
        }
    }

    func predict(input: Float) -> Float? {
        do {
            // Setzen des Eingabewerts
            if let inputTensor = try? interpreter?.input(at: 0) {
                var inputValue: Float32 = Float32(input)
                let inputData = Data(bytes: &inputValue, count: MemoryLayout<Float32>.size)
                try interpreter?.copy(inputData, toInputAt: 0)
            }

            // Ausführung des Modells
            try interpreter?.invoke()

            // Erhalten der Vorhersage
            if let outputData = try? interpreter?.output(at: 0).data {
                let value = outputData.withUnsafeBytes { $0.load(as: Float.self) }
                return value
            } else {
                throw NSError(domain: "TensorError", code: 1003, userInfo: ["description": "Output Tensor konnte nicht geladen werden"])
            }
        } catch let error {
            print("Fehler beim Ausführen des Modells: \(error)")
            return nil
        }
    }
}

class ModelRunner3 {
    private var interpreter: Interpreter?

    init?(modelPath: String) {
        do {
            var options = Interpreter.Options()
            options.threadCount = 1
            self.interpreter = try Interpreter(modelPath: modelPath, options: options)
            try self.interpreter?.allocateTensors()
        } catch let error {
            print("Fehler beim Erstellen des Interpreters: \(error)")
            return nil
        }
    }

    func predict(input: [Float]) -> [Float]? {
        do {
            let inputSize = 44100
            let inputData = Data(buffer: UnsafeBufferPointer(start: input, count: inputSize))
            try interpreter?.copy(inputData, toInputAt: 0)
            try interpreter?.invoke()

            if let outputTensor = try? interpreter?.output(at: 0),
               let outputData = try? outputTensor.data {
                var output = [Float](repeating: 0, count: inputSize)
                outputData.withUnsafeBytes { rawPointer in
                    let pointer = rawPointer.bindMemory(to: Float.self)
                    for i in 0..<inputSize {
                        output[i] = pointer[i]
                    }
                }
                return output
            } else {
                throw NSError(domain: "TensorError", code: 1003, userInfo: ["description": "Output Tensor konnte nicht geladen werden"])
            }
        } catch let error {
            print("Fehler beim Ausführen des Modells: \(error)")
            return nil
        }
    }

}

class AudioModelRunner {
    private var interpreter: Interpreter?

    init?() {
        do {
            // Hartcodierter Pfad zum Modell
            let modelPath = Bundle.main.path(forResource: "modelEmotion", ofType: "tflite")
            
            // Erstellen eines Interpreters für das Modell
            var options = Interpreter.Options()
            options.threadCount = 1
            self.interpreter = try Interpreter(modelPath: modelPath!, options: options)
            // Zuteilung der Tensoren einmalig während der Initialisierung
            try self.interpreter?.allocateTensors()
        } catch let error {
            print("Fehler beim Erstellen des Interpreters: \(error)")
            return nil
        }
    }
    
    func urlToBuffer(url: URL) -> AVAudioPCMBuffer? {
            let targetSampleRate: Double = 16000
            let targetLength: Double = 3 // Sekunden

            do {
                // Lese die Audiodatei
                let audioFile = try AVAudioFile(forReading: url)
                let processingFormat = audioFile.processingFormat

                // Berechne die Frame-Anzahl für 3 Sekunden der Original-Sample-Rate
                let audioFrameCount = AVAudioFrameCount(targetLength * processingFormat.sampleRate)
                guard let buffer = AVAudioPCMBuffer(pcmFormat: processingFormat, frameCapacity: audioFrameCount) else {
                    print("Fehler beim Erstellen des Audio-Buffers.")
                    return nil
                }

                // Lese die ersten 3 Sekunden der Audiodatei oder fülle den Rest mit Nullen auf
                try audioFile.read(into: buffer, frameCount: min(audioFrameCount, AVAudioFrameCount(audioFile.length)))
                buffer.frameLength = audioFrameCount  // Stelle sicher, dass der Buffer voll ist

                // Erstelle ein neues Format für die Ziel-Sample-Rate
                guard let format = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: targetSampleRate, channels: 1, interleaved: false) else {
                    print("Fehler beim Erstellen des Audioformats.")
                    return nil
                }

                // Konvertiere den Buffer in das neue Format
                let converter = AVAudioConverter(from: processingFormat, to: format)!
                let newBuffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(targetLength * targetSampleRate))!
                let inputBlock: AVAudioConverterInputBlock = { inNumPackets, outStatus in
                    outStatus.pointee = .haveData
                    return buffer
                }
                try converter.convert(to: newBuffer, error: nil, withInputFrom: inputBlock)

                return newBuffer
            } catch {
                print("Fehler beim Lesen oder Konvertieren der Datei: \(error)")
                return nil
            }
        }

    func predict(inputBuffer: AVAudioPCMBuffer) -> [Float]? {
        do {
        

            // Stellen Sie sicher, dass die verarbeitete Wellenform die richtige Größe hat
            guard inputBuffer.frameLength == 48000 else {
                print("Die verarbeitete Wellenform hat nicht die erwartete Größe von 48000.")
                return nil
            }
            
            // Konvertieren Sie das Eingabe-Audio-Buffer in ein Float-Array
            var inputArray = [Float](repeating: 0, count: Int(inputBuffer.frameLength))
            if let channelData = inputBuffer.floatChannelData {
                for i in 0..<inputArray.count {
                    inputArray[i] = channelData[0][i] // Für mono: Nutzen Sie nur den ersten Kanal
                }
            }
            
            // Konvertieren Sie das Eingabe-Float-Array in Data
            let inputData = Data(buffer: UnsafeBufferPointer(start: &inputArray, count: inputArray.count))

            // Setzen des Eingabewerts
            try interpreter?.copy(inputData, toInputAt: 0)

            // Ausführung des Modells
            try interpreter?.invoke()

            // Erhalten der Vorhersage
            guard let outputTensor = try interpreter?.output(at: 0) else {
                print("Output Tensor konnte nicht geladen werden")
                return nil
            }

            // Konvertieren Sie die Vorhersage in ein Float-Array
            let outputSize = outputTensor.shape.dimensions[1]
            let results = [Float](unsafeData: outputTensor.data) ?? []

            return results
        } catch let error {
            print("Fehler beim Ausführen des Modells: \(error)")
            return nil
        }
    }
}

extension Data {
    /// Erstellt neue Daten aus einem Float-Array.
    init(copyingBufferOf floats: [Float]) {
        self = floats.withUnsafeBufferPointer(Data.init)
    }
}

extension Array {
    /// Initialisiert ein Array aus einem Data-Objekt
    init?(unsafeData: Data) {
        guard unsafeData.count % MemoryLayout<Element>.stride == 0 else { return nil }
        self = unsafeData.withUnsafeBytes { .init($0.bindMemory(to: Element.self)) }
    }
}

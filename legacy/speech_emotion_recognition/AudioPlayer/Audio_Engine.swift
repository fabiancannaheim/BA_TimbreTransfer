//
//  Audio_Selfmade.swift
//  AudioPlayer
//
//  Created by basil zinsli on 18.10.23.
//

import Foundation
import AVFoundation

class AudioRecorder: ObservableObject {
    var audioRecorder: AVAudioRecorder?
    @Published var isRecording = false
    @Published var memos: [String: URL] = [:] // Dictionary to store memos
    @Published var memoCounter = 0

    func startRecording() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playAndRecord)
            try session.setActive(true)

            let url = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            let filename = "myRecording_\(Date().timeIntervalSince1970).m4a" // Unique filename
            let fileURL = url.appendingPathComponent(filename)

            let settings = [
                AVFormatIDKey: Int(kAudioFormatAppleLossless), // Audio Format
                AVSampleRateKey: 44100,                  // Sample Rate in Hz
                AVEncoderBitRateKey: 320000,
                AVNumberOfChannelsKey: 2,                // Number of Channels (2 for stereo)
                AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue // Audio Quality
            ]

            audioRecorder = try AVAudioRecorder(url: fileURL, settings: settings)
            audioRecorder?.record()
            isRecording = true
        } catch {
            print("Audio Recorder setup failed: \(error)")
        }
    }

    func stopRecording() {
        audioRecorder?.stop()
        isRecording = false
        if let fileURL = audioRecorder?.url {
            print("Recording stopped. File saved to: \(fileURL.path)")
            memoCounter += 1
            
    // Creating a unique identifier for the recording
            let recordingID = "Memo_\(memoCounter)"
            memos[recordingID] = fileURL // Adding the recording to the memos dictionary
            print(memos)
        }
    }
}


class AudioChunkPlayer: ObservableObject {
    private var audioEngine: AVAudioEngine
    private var audioPlayer: AVAudioPlayerNode
    private var reverbNode: AVAudioUnitReverb
    @Published var delayOn: Bool = false
    @Published var lowPassOn: Bool = false
    @Published var isPlaying: Bool = false
    @Published var modelOn: Bool = false
    @Published var modelIIROn: Bool = false
    @Published var modelEmotion: Bool = false
    private var currentChunkIndex: Int = 0
    private var chunks: [AVAudioPCMBuffer] = []
    private var modelRunner: ModelRunner3?
    //private var modelRunner: AudioModelRunner?
    
    // Timer and DispatchQueue for running the timer
    private var dispatchTimer: DispatchSourceTimer?
    private let timerQueue = DispatchQueue(label: "com.yourapp.audiochunkplayer.timerqueue")
    private var playbackStartTime: Date?

    init() {
        self.audioEngine = AVAudioEngine()
        self.audioPlayer = AVAudioPlayerNode() // Initialize one palyer
        self.reverbNode = AVAudioUnitReverb()
        setupAudioEngine()
        if let modelPath = Bundle.main.path(forResource: "iir_lowpass_model", ofType: "tflite") {
                    self.modelRunner = ModelRunner3(modelPath: modelPath)
                }
    }
    
    // Starts a timer that triggers every second on a separate thread
    func startTimer() {
        playbackStartTime = Date() // Set the start time when the timer starts
        dispatchTimer = DispatchSource.makeTimerSource(queue: timerQueue)
        dispatchTimer?.schedule(deadline: .now(), repeating: 1.0)
        dispatchTimer?.setEventHandler { [weak self] in
            self?.timerAction()
        }
        dispatchTimer?.resume()
    }
    
    // Stops the timer
    func stopTimer() {
        dispatchTimer?.cancel()
        dispatchTimer = nil
    }
    
    // The action the timer performs
    @objc private func timerAction() {
        // This code is executed every second
        let elapsedTime = Date().timeIntervalSince(playbackStartTime ?? Date())
               
       // Output the elapsed time with each timer tick
        print("Timer tick - Elapsed Time: \(elapsedTime) seconds")
        playbackStartTime = Date() // Set the start time when the timer starts
        rndrPlayChunks()
        print("Timer tick")
    }
    
    
    
    private func setupAudioEngine() {
            // Attach all audio players and the reverb node to the audio engine
        
            
        self.audioEngine.attach(self.audioPlayer)
        self.audioEngine.attach(self.reverbNode)
            
        setupConnections()
        
            do {
                try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
                try AVAudioSession.sharedInstance().setActive(true)
            } catch {
                print("Failed to set up audio session: \(error)")
            }

        }
    
    
    private func setupConnections() {
            // Connect each player to the main mixer node
        self.audioEngine.disconnectNodeInput(self.audioEngine.mainMixerNode)
        self.audioEngine.connect(self.audioPlayer, to: self.audioEngine.mainMixerNode, format: nil)
        }
    
    //Decode and save whole file in buffer
    func decodeAudio(filePath: URL) -> AVAudioPCMBuffer? {
        do {
            let audioFile = try AVAudioFile(forReading: filePath)
            let format = audioFile.processingFormat
            let frameCount = UInt32(audioFile.length)
            let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount)
            try audioFile.read(into: buffer!)
            if let channelData = buffer?.floatChannelData {
                        for index in 0..<min(2, Int(buffer!.frameLength)) {
                            print(channelData[0][index])
                        }
                    }
            return buffer
        } catch {
            print("Error decoding Audio: \(error)")
            return nil
        }
    }
    
    //Save complete buffer in an array of chunks
    private func chunkBuffer(buffer: AVAudioPCMBuffer, chunkSize: AVAudioFrameCount) -> [AVAudioPCMBuffer] {
        var chunks: [AVAudioPCMBuffer] = []
        var frameOffset: AVAudioFramePosition = 0
        while frameOffset < buffer.frameLength {
            let chunkFrameCount = min(chunkSize, AVAudioFrameCount(Int64(buffer.frameLength) - frameOffset))
            if let chunk = AVAudioPCMBuffer(pcmFormat: buffer.format, frameCapacity: chunkFrameCount) {
                chunk.frameLength = chunkFrameCount
                for channel in 0..<buffer.format.channelCount {
                    let bufferPointer = buffer.floatChannelData![Int(channel)]
                    let chunkPointer = chunk.floatChannelData![Int(channel)]
                    for frame in 0..<Int(chunkFrameCount) {
                        chunkPointer[frame] = bufferPointer[frame + Int(frameOffset)]
                    }
                }
                chunks.append(chunk)
            }
            frameOffset += AVAudioFramePosition(chunkFrameCount)
        }
        return chunks
    }
    
    //This function gets called once from Contentview to start playback
    func runAudio(filePath: URL) {
        if !audioEngine.isRunning {
            do {
                try audioEngine.start()
            } catch {
                print("Error restarting the audio engine: \(error)")
                return
            }
        }
    
        guard let decodedBuffer = decodeAudio(filePath: filePath) else {
            print("Failed to decode audio.")
            return
        }

        let chunkSize: AVAudioFrameCount = 44100  // Adjust as needed
        self.chunks = chunkBuffer(buffer: decodedBuffer, chunkSize: chunkSize)
        self.currentChunkIndex = 0
        isPlaying = true  // Ensure isPlaying is true to start playback
        rndrPlayChunks()
    }
    
    
    //First chunk gets played and timer calls rndrPlayChunks every second
    private func rndrPlayChunks() {
        if currentChunkIndex < chunks.count {
            
            
            
            if self.delayOn{
                if let delayedChunk = chunkDelay(inputBuffer: self.chunks[currentChunkIndex], sampleRate: 44100, delayTime: 0.2, decayFactor: 0.1) {
                    self.chunks[currentChunkIndex] = delayedChunk
                }
            }
            
            
            if self.lowPassOn{
                if let lowpassChunk = chunkLowPassFilter(to: self.chunks[currentChunkIndex]){
                    self.chunks[currentChunkIndex] = lowpassChunk
                }
            }
            
            
            if self.modelIIROn{
                if let processedChunk = processChunkWithModelIIR(self.chunks[currentChunkIndex]) {
                    self.chunks[currentChunkIndex] = processedChunk
                }
            }
            
            
            
            if currentChunkIndex == 0 {
                print("First Chunk played.")
                print(self.chunks[currentChunkIndex], currentChunkIndex)
                
                self.audioPlayer.scheduleBuffer(self.chunks[currentChunkIndex])
                
                if !self.audioEngine.isRunning {
                    do {
                        try self.audioEngine.start()
                        isPlaying = true
                    } catch {
                        print("Error starting the audio engine: \(error)")
                        return
                    }
                }
                
                if !self.audioPlayer.isPlaying {
                    self.audioPlayer.play()
                }
                currentChunkIndex += 1
                startTimer()
            } else {
                print("Playing Chunk: \(currentChunkIndex)")
                print(self.chunks[currentChunkIndex], currentChunkIndex)
                
                self.audioPlayer.scheduleBuffer(self.chunks[currentChunkIndex])
                
                if !self.audioPlayer.isPlaying {
                    self.audioPlayer.play()
                }
                
                currentChunkIndex += 1
            }
        } else {
            stopTimer()
            print("All chunks have been played.")
            isPlaying = false
            self.currentChunkIndex = 0
        }
    }
    
    
    
    
    
    func chunkDelay(inputBuffer: AVAudioPCMBuffer, sampleRate: Int, delayTime: Float, decayFactor: Float) -> AVAudioPCMBuffer? {
        // Create a copy of the input buffer
        guard let copiedBuffer = inputBuffer.copy() as? AVAudioPCMBuffer else {
            return nil // Unable to create a copy
        }

        let frameCount = AVAudioFrameCount(copiedBuffer.frameLength)
        let bufferLength = Int(delayTime * Float(sampleRate))
        
        guard bufferLength > 0 else {
            return nil // Invalid delay time
        }
        
        var delayBuffer: [Float] = Array(repeating: 0, count: bufferLength)
        var delayIndex = 0

        guard let floatData = copiedBuffer.floatChannelData?[0] else {
            return nil // Unable to access the float data
        }

        for frame in 0..<frameCount {
            let sample = floatData[Int(frame)]
            let delayedSample = delayBuffer[delayIndex]

            // Apply decay and add to the delay buffer
            delayBuffer[delayIndex] = sample + delayedSample * decayFactor

            // Apply the delay effect to the sample in the copied buffer
            floatData[Int(frame)] = sample + delayedSample

            // Increment and wrap the delay index
            delayIndex = (delayIndex + 1) % bufferLength
        }

        return copiedBuffer
    }
    
    
    func chunkLowPassFilter(to chunk: AVAudioPCMBuffer) -> AVAudioPCMBuffer? {
    let gain: Float = 1
    let b: [Float] = [0.00019897, 0.00039794, 0.00019897]
    let a: [Float] = [1, -1.95970703, 0.96050292]
        

    let frameCount = chunk.frameLength
    let outputBuffer = AVAudioPCMBuffer(pcmFormat: chunk.format, frameCapacity: frameCount)!
    outputBuffer.frameLength = frameCount

    // Assuming 'chunk' has 2 channels for stereo audio
    // We need to keep track of previous samples for both channels
    var previousInputSamples = [[Float](repeating: 0, count: b.count), [Float](repeating: 0, count: b.count)]
    var previousOutputSamples = [[Float](repeating: 0, count: a.count), [Float](repeating: 0, count: a.count)]

    // Process each frame/sample for both channels
    for channel in 0..<2 { // Assuming there are 2 channels for stereo
        for frame in 0..<Int(frameCount) {
            let inputSample = chunk.floatChannelData![channel][frame]

            // Apply the filter
            var y_n: Float = b[0] * inputSample
            for i in 1..<b.count {
                y_n += b[i] * previousInputSamples[channel][i-1]
            }
            for i in 1..<a.count {
                y_n -= a[i] * previousOutputSamples[channel][i-1]
            }

            // Apply gain and store the result
            let result = (y_n / a[0]) * gain
            outputBuffer.floatChannelData![channel][frame] = result

            // Update previous samples for the channel
            previousInputSamples[channel] = [inputSample] + previousInputSamples[channel].dropLast()
            previousOutputSamples[channel] = [result] + previousOutputSamples[channel].dropLast()
        }
    }
        // Return the processed stereo buffer
        return outputBuffer
    }

    private func processChunkWithModel(_ chunk: AVAudioPCMBuffer) -> AVAudioPCMBuffer? {
        guard
            let modelPath = Bundle.main.path(forResource: "one_third_model", ofType: "tflite"),
            let modelRunner3 = ModelRunner3(modelPath: modelPath),
            let channelData = chunk.floatChannelData?.pointee
        else { return nil }

        let frameLength = Int(chunk.frameLength)
        var inputArray = [Float](repeating: 0, count: frameLength)

        for frame in 0..<frameLength {
            inputArray[frame] = channelData[frame]
        }

        guard let outputArray = modelRunner3.predict(input: inputArray) else { return nil }
        guard outputArray.count == inputArray.count else { return nil }
        guard let outputBuffer = AVAudioPCMBuffer(pcmFormat: chunk.format, frameCapacity: AVAudioFrameCount(outputArray.count)) else { return nil }

        outputBuffer.frameLength = outputBuffer.frameCapacity
        let outputChannelData = outputBuffer.floatChannelData!

        for frame in 0..<frameLength {
            outputChannelData.pointee[frame] = outputArray[frame]
        }

        return outputBuffer
    }

    
    private func processChunkWithModelIIR(_ chunk: AVAudioPCMBuffer) -> AVAudioPCMBuffer? {
        guard
            let modelPath = Bundle.main.path(forResource: "iir_lowpass_model", ofType: "tflite"),
            let modelRunner3 = ModelRunner3(modelPath: modelPath),
            let channelData = chunk.floatChannelData?.pointee
        else { return nil }

        let frameLength = Int(chunk.frameLength)
        var inputArray = [Float](repeating: 0, count: frameLength)

        for frame in 0..<frameLength {
            inputArray[frame] = channelData[frame]
        }

        guard let outputArray = modelRunner3.predict(input: inputArray) else { return nil }
        guard outputArray.count == inputArray.count else { return nil }
        guard let outputBuffer = AVAudioPCMBuffer(pcmFormat: chunk.format, frameCapacity: AVAudioFrameCount(outputArray.count)) else { return nil }

        outputBuffer.frameLength = outputBuffer.frameCapacity
        let outputChannelData = outputBuffer.floatChannelData!

        for frame in 0..<frameLength {
            outputChannelData.pointee[frame] = outputArray[frame]
        }

        return outputBuffer
    }
    
    func stopChunk() {
        stopTimer()
        audioPlayer.stop()
        // Stop the audio engine if you want to stop all audio processing
        // You may need to handle the audio engine restart logic elsewhere if needed
        audioEngine.stop()
        isPlaying = false
    }
}



// Funktion zum Generieren einer Sinuswelle und Speichern in einer WAV-Datei
func generateSineWave(frequency: Double, duration: TimeInterval, atPath path: URL) {
    // Grundlegende Audioeinstellungen
    let sampleRate: Double = 44100.0
    let amplitude: Double = 0.5
    
    let totalSamples = Int(sampleRate * duration)
    
    // Erstellen eines AudioBuffers
    let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1)!
    let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(totalSamples))!
    buffer.frameLength = buffer.frameCapacity
    
    let channelData = buffer.floatChannelData![0]
    
    for sample in 0..<totalSamples {
        let time = Double(sample) / sampleRate
        channelData[sample] = Float(amplitude * sin(2.0 * .pi * frequency * time))
    }
    
    // Speichern des Buffers in eine WAV-Datei
    do {
        let audioFile = try AVAudioFile(forWriting: path, settings: format.settings)
        try audioFile.write(from: buffer)
    } catch {
        print("Fehler beim Speichern der WAV-Datei: \(error.localizedDescription)")
    }
}







//
//  ContentView.swift
//  AudioPlayer
//
//  Created by eyh.mac on 9.08.2023.
//

import SwiftUI
import AVFoundation

struct ContentView: View {
    @StateObject var playerInstance = AudioChunkPlayer()
    @StateObject var recInstance = AudioRecorder()
    var ModelEmotionInstance = AudioModelRunner()
    @State var selectedMemoURL: URL?
    @State var selectedMemoKey: String? // Track the key of the selected memo
    @State var emojiIndex: Int?
    @State var currentEmoji: String = "🎙️"
    @State var emotion: String = ""
    @Binding var expandSheet: Bool
    var animation: Namespace.ID
    //let emotions = ["Angst", "Ekel", "Freude", "Neutral", "None", "Trauer", "Wut"]
    let emotionToEmoji: [String: String] = [
        "fear": "😨",    // Fear
        "disgust": "🤢",     // Disgust
        "joy": "😊",   // Joy
        "normal": "😐",  // Neutral
        "nothing": "🚫",     // None or Unknown
        "sadness": "😢",   // Sadness
        "anger": "😡"       // Anger
    ]

    var body: some View {
        GeometryReader { geometry in
            let size = geometry.size
            let safeArea = geometry.safeAreaInsets

            ZStack {
                
                Rectangle()
                Color.black.ignoresSafeArea() // Set this to cover the entire background including the safe area
                // List of Memos
                ScrollView {
                    LazyVStack {
                        Text("Record 3s and let me analyze your emotion!")
                                        .font(.title)
                                        .padding()
                                        .foregroundColor(.white)
                        ForEach(recInstance.memos.keys.sorted(), id: \.self) { key in
                            HStack {
                                Button(action: {
                                    self.selectedMemoKey = key // Set the selected key
                                    self.selectedMemoURL = recInstance.memos[key] // Set the selected URL
                                }) {
                                    Text(key)
                                        .foregroundColor(selectedMemoKey == key ? .red : .white) // Highlight in red if selected
                                        .padding()
                                }
                                Spacer()
                                Button(action: {
                                    // Action to delete the item from the dictionary
                                    recInstance.memos.removeValue(forKey: key)
                                    // If the deleted memo is the one selected, clear the selection
                                    if key == selectedMemoKey {
                                        selectedMemoKey = nil
                                        selectedMemoURL = nil
                                    }
                                }) {
                                    Image(systemName: "trash")
                                        .foregroundColor(.red)
                                        .padding()
                                }
                            }
                            .background(Color.black) // Background for each row
                        }
                    }
                }
                .padding(.top, safeArea.top) // Padding on the top of the list

                VStack(spacing: 15) {
                    Spacer()
                 
                    Text(currentEmoji)
                            .font(.system(size: 100)) // Adjust size as needed
                            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                    
                    if emotion != "" {
                        Text("I sense you're feeling \(emotion).")
                            .font(.system(size: 20)) // Adjust size as needed
                            .frame(maxWidth: .infinity, alignment: .center)
                            .foregroundColor(.white)
                    }
                    Spacer()
                    Spacer()
                    Spacer()
                    
                    // Model Button
                    Button(action: {
                        playerInstance.modelOn.toggle()
                        if let url = self.selectedMemoURL {
                            var bufferArray = ModelEmotionInstance?.urlToBuffer(url: url)
                            if let outputArray = ModelEmotionInstance?.predict(inputBuffer: bufferArray!) {
                                

                                // Assuming outputArray is an array of Floats
                                if let maxValue = outputArray.max() {
                                    emojiIndex = (outputArray.firstIndex(of: maxValue)!)
                                    
                                    let emotionKeys =  [
                                        "fear",   // Fear
                                        "disgust",     // Disgust
                                        "joy",   // Joy
                                        "normal",  // Neutral
                                        "nothing",     // None or Unknown
                                        "sadness",   // Sadness
                                        "anger"       // Anger
                                    ]
// Create an array of keys from the dictionary
                                    emotion = emotionKeys[emojiIndex ?? 0]  // Get the emotion name from the array
                                    currentEmoji = emotionToEmoji[emotion] ?? "🤔" // Update the current emoji
                                    print(outputArray)
                                    print(emojiIndex)
                                    print(emotion)
                                    print(emotion)
                                    
                                    
                                    
                                }
                            }
                        } else {
                            // Handle the case where there is no selected memo URL
                            // For example, you might want to show an alert or set a default state
                            currentEmoji = "❓"
                        }
                    }) {
                        Text("Tell me how I feel")
                            .font(.title3)
                            .foregroundColor(.white)
                    }

                    
                    // Remaining UI Components
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: size.width * 0.18) {
                            // Low Pass Button
                            Button(action: {
                                playerInstance.lowPassOn.toggle()
                            }) {
                                Text("Low Pass")
                                    .font(.title3)
                                    .foregroundColor(playerInstance.lowPassOn ? .red: .white)
                            }
                            Spacer()
                            // Delay Button
                            Button(action: {
                                playerInstance.delayOn.toggle()
                            }) {
                                Text("Delay")
                                    .font(.title3)
                                    .foregroundColor(playerInstance.delayOn ? .red: .white)
                            }

                            
                        }
                        .padding(.horizontal, 10)
                        
                    }

                    // Play/Pause Button
                    Button(action: {
                        if playerInstance.isPlaying {
                            playerInstance.stopChunk()
                        } else {
                            if let url = selectedMemoURL {
                                playerInstance.runAudio(filePath: url)
                            }
                        }
                    }) {
                        Image(systemName: playerInstance.isPlaying ? "pause.fill" : "play.fill")
                            .font(.largeTitle)
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)

                    // Record/Stop Button
                    Button(action: {
                        if recInstance.isRecording {
                            recInstance.stopRecording()
                        } else {
                            recInstance.startRecording()
                        }
                    }) {
                        Image(systemName: recInstance.isRecording ? "stop.fill" : "record.circle")
                            .font(.largeTitle)
                            .foregroundColor(recInstance.isRecording ? .red : .white)
                    }
                }
                .padding(.top, safeArea.top)
                .padding(.bottom, safeArea.bottom)
                .padding(.horizontal, 25)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                
            }
            .ignoresSafeArea(.container, edges: .all)
        }
    }
}



func testModel() {
        // TensorFlow Lite Modelltest
        if let modelURL = Bundle.main.url(forResource: "one_third_model", withExtension: "tflite") {
            let modelPath = modelURL.path
            if let runner = ModelRunner3(modelPath: modelPath) {
                let inputArray = [Float](repeating: -0.0055770874, count: 44100)
                //print("Länge des Eingabe-Arrays: \(inputArray.count)")
                
                if let outputArray = runner.predict(input: inputArray) {
                    //print("Erste 10 Ausgabewerte: \(outputArray.prefix(10))")
                    
                   // print("Länge des Ausgabe-Arrays: \(outputArray.count)")
                } else {
                    print("Fehler bei der Vorhersage")
                }
            } else {
                print("Fehler beim Initialisieren des ModelRunners")
            }
        } else {
            print("Modell-URL konnte nicht gefunden werden")
        }
    }


    


struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView(expandSheet: .constant(true), animation: Namespace().wrappedValue)
            .preferredColorScheme(.dark)
    }
}


extension View{
    var deviceCornerRadius: CGFloat {
        
       let key = "_displayCornerRadius"
        
       if let screen = (UIApplication.shared.connectedScenes.first as? UIWindowScene)?.windows.first?.screen{
            if let cornerRadius = screen.value(forKey: key) as? CGFloat {
                return cornerRadius
            }
            return 0
        }
        return 0
    }
}



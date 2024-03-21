import Foundation
import AVFoundation
var player: AVPlayer?

class JamendoService {
    private let baseURL = "https://api.jamendo.com/v3.0"
    private let clientID = "94bf7e46"

    func fetchTracks(completion: @escaping ([Track]?, Error?) -> Void) {
        let urlString = "\(baseURL)/tracks/?client_id=\(clientID)&format=jsonpretty"
        
        guard let url = URL(string: urlString) else {
            completion(nil, NSError(domain: "Invalid URL", code: 400, userInfo: nil))
            return
        }
        
        URLSession.shared.dataTask(with: url) { (data, response, error) in
            guard let data = data, error == nil else {
                completion(nil, error)
                return
            }
            
            /* Step 1: Print raw JSON response
            if let rawJSON = String(data: data, encoding: .utf8) {
                print(rawJSON)
            }
            */
            // Existing decoding logic
            do {
                let decoder = JSONDecoder()
                let response = try decoder.decode(JamendoTracksResponse.self, from: data)
                completion(response.results, nil)  // Note we are using `response.results` here
            } catch let decodeError {
                completion(nil, decodeError)
            }
            
        }.resume()
    }
}

func playAudioFromURL(url: URL) {
    player = AVPlayer(url: url)
    player?.play()
}


struct JamendoTracksResponse: Codable {
    let results: [Track]
}

struct Track: Codable {
    let id: String
    let name: String
    let duration: Int
    let artist_id: String
    let artist_name: String
    let artist_idstr: String
    let album_name: String
    let album_id: String
    let license_ccurl: String
    let position: Int
    let releasedate: String
    let album_image: String
    let audio: String
    let audiodownload: String
    let prourl: String
    let shorturl: String
    let shareurl: String
    let audiodownload_allowed: Bool
    let image: String
    // Add other properties as needed
}

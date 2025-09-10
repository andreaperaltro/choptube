# 🎵 ChopTube

**Turn any YouTube video into a drum machine!**

ChopTube is a web application that allows you to chop and play samples from YouTube videos using a virtual drum machine interface. Load any YouTube video, set timestamps on drum pads, and create beats by triggering different sections of the video.

![ChopTube Demo](https://via.placeholder.com/800x400/1a1a1a/00a8ff?text=ChopTube+Drum+Machine)

## ✨ Features

### 🎛️ **Drum Machine Interface**
- **16 drum pads** with keyboard controls
- **Visual feedback** with color-coded states (unset, set, playing)
- **Real-time timestamp display** on each pad
- **Settings panel** for fine-tuning timestamps

### 🎬 **YouTube Integration**
- **Direct YouTube URL support** - paste any YouTube link
- **Smart paste functionality** - click "Paste" button when URL field is empty
- **Video timeline** with scrubbing and playback controls
- **YouTube IFrame Player API** integration

### ⚡ **Auto-Quantize**
- **One-click quantization** - automatically divide video into 16 equal parts
- **Perfect for beat-making** - evenly spaced samples across the entire track
- **Instant setup** - no manual timestamp setting required

### ⌨️ **Keyboard Controls**
- **Drum pads**: `4`, `5`, `6`, `7`, `R`, `T`, `Y`, `U`, `D`, `F`, `G`, `H`, `C`, `V`, `B`, `N`
- **Video control**: `Spacebar` for play/pause
- **Smart modifier handling** - Cmd/Ctrl combinations work normally

### 🎨 **Modern UI/UX**
- **Dark industrial theme** inspired by professional drum machines
- **Responsive design** - works on desktop and mobile
- **Smooth animations** and visual feedback
- **Professional typography** with Inter font family

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/andreaperaltro/choptube.git
   cd choptube
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 How to Use

### 1. **Load a Video**
- Paste a YouTube URL in the input field
- Click "Load Video" (or "Paste" if the field is empty)
- Wait for the video to load

### 2. **Set Up Drum Pads**

#### **Manual Setup:**
- Play the video
- Click any empty drum pad to set its timestamp to the current time
- Use the settings icon (⚙️) to fine-tune timestamps with +/- 1 second adjustments

#### **Auto-Quantize:**
- Click "Auto-Quantize (16 Parts)" to automatically divide the video into 16 equal segments
- Each pad will be set to the beginning of its corresponding section

### 3. **Play and Create**
- Click drum pads to play their assigned timestamps
- Use keyboard shortcuts for faster triggering
- Press `Spacebar` to control video playback
- Create beats by triggering different pads in sequence

### 4. **Fine-Tune**
- Click the settings icon on any pad to:
  - Adjust timestamp by ±1 second
  - Manually edit the timestamp
  - Delete the timestamp

## 🎹 Keyboard Layout

```
Row 1:  4  5  6  7
Row 2:  R  T  Y  U  
Row 3:  D  F  G  H
Row 4:  C  V  B  N

Spacebar: Play/Pause video
```

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **YouTube API**: YouTube IFrame Player API
- **Font**: Inter (Google Fonts)

## 📁 Project Structure

```
choptube/
├── src/
│   ├── app/
│   │   ├── globals.css          # Global styles and theme
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx             # Main application
│   └── components/
│       ├── YouTubePlayer.tsx    # YouTube player component
│       ├── DrumMachine.tsx      # Drum machine interface
│       └── VideoTimeline.tsx    # Video timeline controls
├── public/                      # Static assets
├── package.json
└── README.md
```

## 🎨 Design Philosophy

ChopTube is designed with a **dark industrial aesthetic** inspired by professional drum machines like those found on [drumbit.app](https://drumbit.app/). The interface prioritizes:

- **Functionality over decoration** - every element serves a purpose
- **Visual feedback** - clear indication of pad states and interactions
- **Keyboard-first workflow** - efficient for rapid beat creation
- **Professional appearance** - suitable for both casual and professional use

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Environment Variables

No environment variables are required for basic functionality. The app uses the public YouTube IFrame Player API.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the drum machine interface design from [drumbit.app](https://drumbit.app/)
- Built with modern web technologies and best practices
- YouTube IFrame Player API for seamless video integration

## 🔮 Future Features

- [ ] **Save/Load Projects** - Save drum pad configurations
- [ ] **Export Audio** - Export created beats as audio files
- [ ] **Multiple Videos** - Load multiple videos simultaneously
- [ ] **Advanced Quantization** - Custom quantization patterns
- [ ] **MIDI Support** - Connect external MIDI controllers
- [ ] **Collaborative Mode** - Share projects with others

---

**Made with ❤️ for music creators and beat makers**

*Turn any YouTube video into your next beat!*
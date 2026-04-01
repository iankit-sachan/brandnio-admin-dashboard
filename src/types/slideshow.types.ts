export interface TransitionDef {
  id: string
  name: string
  icon: string
  sort_order: number
}

export interface SlideshowConfig {
  // Video encoding
  output_width: number
  output_height: number
  fps: number
  bitrate: number
  iframe_interval: number
  transition_duration_frames: number
  quality_label: string

  // Duration
  min_duration_seconds: number
  max_duration_seconds: number
  default_duration_seconds: number
  duration_step_seconds: number
  duration_presets: number[]

  // Transitions
  transitions: TransitionDef[]
  default_transition: string

  // Image limits
  max_images: number
  min_images: number
  max_image_dimension: number
  thumbnail_size: number

  // Output
  download_folder: string
  filename_prefix: string
  credits_per_video: number

  updated_at: string
}

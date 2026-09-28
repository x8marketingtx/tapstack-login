export const IMAGE_UPLOAD_AGREEMENT =
  'I agree that this image is not offensive, obscene, defamatory, hateful, sexually explicit, or otherwise unlawful; does not depict anyone under 18 years of age; does not infringe any copyright, trademark, privacy, or publicity right; and that I have all rights necessary to upload and display it on TapStack. I understand TapStack may remove the image and suspend or terminate my account if this representation is false or if the image is reported and found to violate these terms.'

export function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  return /\.(png|jpe?g|gif|webp|heic|heif|bmp|svg)$/i.test(file.name)
}

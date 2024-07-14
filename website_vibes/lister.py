import os
import json
import tqdm
import sys
try:
    from PIL import Image, ImageOps
    import pillow_avif
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError as e:
    print("Got import error", e)
    print("You need to install pillow, pillow-heif and pillow-avif: `pip3 install pillow pillow-heif`")
    sys.exit(1)

files = []
dir = "original_images/"
for file in tqdm.tqdm(os.listdir(dir)):
    try:
        # https://stackoverflow.com/questions/63947990/why-are-width-and-height-of-an-image-are-inverted-when-loading-using-pil-versus
        # it won't recognize things i've rotated w/o this
        im = ImageOps.exif_transpose(Image.open(dir + file))
        out_filename = "avif_images/" + ".".join(file.split(".")[:-1]) + ".avif"
        files.append([out_filename, [im.width, im.height]])
        if len(sys.argv) == 1:
            im.save(out_filename,'AVIF')
    except Exception as e: # e.g. .DS_Store, calculater.py, file
        print(e)
        continue

if files:
    json.dump(files, open("image_widths_heights.json", 'w'))
    print(f"Successfully created image_widths_heights.json with {len(files)} files.")
else:
    print("Found no files, exiting.")
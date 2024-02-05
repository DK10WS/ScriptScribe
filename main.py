import pytesseract
from PIL import Image
import cv2


myconfig= r"--psm 1 --oem 3"

image=pytesseract.image_to_string(Image.open( "photo.jpg" ), config= myconfig)
print(image)

img= cv2.imread("/home/DK10/ocr/photo.jpg")

height, width, lol = img.shape

boxes= pytesseract.image_to_boxes(img , config=myconfig)
for box in boxes.splitlines():
    box = box.split(" ")
    x, y, w, h = int(box[1]), int(box[2]), int(box[3]), int(box[4])
    img = cv2.rectangle(img, (x, height - y), (w, height - h), (0, 255, 0), 2)  
cv2.imshow("NIGG" , img)
cv2.waitKey(0)

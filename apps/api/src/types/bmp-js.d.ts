declare module "bmp-js" {
  type Bitmap = {
    data: Buffer;
    width: number;
    height: number;
  };

  export function encode(bitmap: Bitmap): {
    data: Buffer;
  };
}

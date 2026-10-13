import { cropRectangle, prepareProfilePhoto, MAX_SOURCE_BYTES } from './profilePhoto';

test('enquadramento mantém o recorte quadrado dentro da imagem em todos os extremos', () => {
  expect(cropRectangle(1200,800)).toEqual({x:200,y:0,side:800});
  expect(cropRectangle(800,1200,2,-100,100)).toEqual({x:0,y:800,side:400});
  for(const [w,h] of [[1200,800],[800,1200],[768,768]]) for(const zoom of [1,2,3]) for(const p of [-100,0,100]) {
    const r=cropRectangle(w,h,zoom,p,p);
    expect(r.x).toBeGreaterThanOrEqual(0);expect(r.y).toBeGreaterThanOrEqual(0);
    expect(r.x+r.side).toBeLessThanOrEqual(w);expect(r.y+r.side).toBeLessThanOrEqual(h);
  }
});

test('rejeita arquivos vazios, grandes e formatos não suportados antes de decodificar', async () => {
  await expect(prepareProfilePhoto({size:0,name:'empty.jpg',type:'image/jpeg'})).rejects.toThrow('15 MB');
  await expect(prepareProfilePhoto({size:MAX_SOURCE_BYTES+1,name:'big.jpg',type:'image/jpeg'})).rejects.toThrow('15 MB');
  await expect(prepareProfilePhoto({size:10,name:'script.svg',type:'image/svg+xml'})).rejects.toThrow('JPG');
});

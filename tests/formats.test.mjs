import test from 'node:test';
import assert from 'node:assert/strict';
import {compressImageToTarget} from '../src/image.js';

function input(type) {
  const b=new Uint8Array(1500);
  if(type==='image/png') {b.set([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82]);const d=new DataView(b.buffer);d.setUint32(16,1);d.setUint32(20,1);}
  if(type==='image/webp') b.set([82,73,70,70,22,0,0,0,87,69,66,80,86,80,56,88]);
  if(type==='image/jpeg') b.set([255,216,255,217]);
  return new Blob([b],{type});
}
async function withCanvas(alpha, fallback, run) {
  const oldBitmap=globalThis.createImageBitmap,oldDocument=globalThis.document,seen=[];
  let closed=0;
  globalThis.createImageBitmap=async()=>({width:1,height:1,close(){closed++;}});
  globalThis.document={createElement:()=>({getContext:()=>({drawImage(){},clearRect(){},fillRect(){},getImageData:()=>({data:new Uint8ClampedArray([0,0,0,alpha])})}),toBlob(callback,mime){seen.push(mime);callback(new Blob([new Uint8Array(mime==='image/webp'?20:30)],{type:fallback || mime}));}})};
  try {await run(seen);assert.ok(closed>0);}finally{globalThis.createImageBitmap=oldBitmap;globalThis.document=oldDocument;}
}
test('rejects obsolete codec selections and invalid modes',async()=>{
  for(const mode of ['auto','jpeg','webp','png','other']) await assert.rejects(compressImageToTarget(input('image/png'),1024,{mode}),/Invalid output mode/);
});
test('smallest compares bytes and never chooses JPEG with alpha',async()=>{
  await withCanvas(0,null,async seen=>{
    const r=await compressImageToTarget(input('image/png'),1024);
    assert.equal(r.blob.type,'image/webp');assert.equal(r.blob.size,20);assert.equal(r.hasTransparency,true);
    assert.ok(seen.includes('image/png'));assert.ok(!seen.includes('image/jpeg'));
  });
  await withCanvas(255,null,async seen=>{
    assert.equal((await compressImageToTarget(input('image/jpeg'),1024)).blob.type,'image/webp');
    assert.ok(seen.includes('image/jpeg'));
  });
});
test('original retains each input MIME and does not try other codecs',async()=>{
  for(const mime of ['image/jpeg','image/png','image/webp']) await withCanvas(mime==='image/jpeg'?255:0,null,async seen=>{
    assert.equal((await compressImageToTarget(input(mime),1024,{mode:'original'})).blob.type,mime);
    assert.deepEqual([...new Set(seen)],[mime]);
  });
});
test('original refuses silent MIME fallback; smallest retains safe alpha fallback',async()=>{
  await withCanvas(0,'image/png',async()=>{
    await assert.rejects(compressImageToTarget(input('image/webp'),1024,{mode:'original'}),/Unsupported output format/);
    assert.equal((await compressImageToTarget(input('image/png'),1024)).blob.type,'image/png');
  });
});

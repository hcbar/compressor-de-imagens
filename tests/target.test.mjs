import test from 'node:test';
import assert from 'node:assert/strict';
import {compressImageToTarget} from '../src/image.js';

function fakePng(bytes, width=512, height=512) {
  const a=new Uint8Array(bytes);
  a.set([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82]);
  const v=new DataView(a.buffer);
  v.setUint32(16,width);v.setUint32(20,height);
  return new Blob([a], {type:'image/png'});
}
async function mockedCanvas(run) {
  const oldBitmap=globalThis.createImageBitmap, oldDocument=globalThis.document;
  const bitmap={width:512,height:512,closed:false,close(){this.closed=true;}};
  globalThis.createImageBitmap=async()=>bitmap;
  globalThis.document={createElement(){
    const canvas={
      width:0,height:0,
      getContext(){return {drawImage(){},clearRect(){},fillRect(){},getImageData(){return {data:new Uint8ClampedArray([0,0,0,255])};}};},
      toBlob(callback,mime,quality) {
        const area=this.width*this.height;
        const compressedBytes=Math.max(140, Math.ceil(area*.3*(quality??1)));
        callback(new Blob([new Uint8Array(compressedBytes)],{type:mime}));
      }
    };
    return canvas;
  }};
  try {await run();assert.equal(bitmap.closed,true);}
  finally {globalThis.createImageBitmap=oldBitmap;globalThis.document=oldDocument;}
}

test('single automatic target is a hard byte ceiling, including 1 KB',async()=>{
  await mockedCanvas(async()=>{
    const input=fakePng(8000);
    const tiny=await compressImageToTarget(input,1024);
    assert.equal(tiny.reachedTarget,true);
    assert.ok(tiny.blob.size<=1024, 'Result must not exceed 1 KB');
    assert.ok(tiny.width<512, 'Must downscale if necessary');
  });
});

test('already-small valid input is returned unchanged without lossy conversion',async()=>{
  await mockedCanvas(async()=>{
    const input=fakePng(400);
    const result=await compressImageToTarget(input,1024);
    assert.equal(result.blob,input);
    assert.equal(result.unchanged,true);
    assert.ok(result.blob.size<=1024);
  });
});

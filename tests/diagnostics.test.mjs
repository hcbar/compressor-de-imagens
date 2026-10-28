import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {APP_VERSION,createDiagnostic} from '../src/diagnostics.js';
import {compressImageToTarget} from '../src/image.js';

test('version matches package; diagnostics have a closed schema and ignore all private fields',()=>{
  assert.equal(APP_VERSION,JSON.parse(readFileSync('package.json')).version);
  const e=Object.assign(new Error('PRIVATE raw message https://private.invalid'),{
    code:'PRIVATE_CODE',stage:'PRIVATE',category:'PRIVATE',path:'/PRIVATE',name:'PRIVATE',
    fileName:'PRIVATE.png',metadata:'PRIVATE',hash:'PRIVATE',width:999,
  });
  assert.deepEqual(createDiagnostic(e,'export'),{
    tool:'Image Compressor',version:'0.1.1',stage:'export',code:'IC_PROCESSING_FAILED',category:'processing',
  });
  assert.ok(!JSON.stringify(createDiagnostic(e,'PRIVATE')).includes('PRIVATE'));
  const limit=createDiagnostic({code:'PIXEL_LIMIT'},'opening');
  assert.equal(limit.category,'limit');assert.equal(limit.stage,'validation');
  for(const stage of ['opening','validation','rendering','conversion','export'])
    assert.equal(createDiagnostic(new Error('PRIVATE'),stage).stage,stage);
});
test('malformed headers and native decoder failures expose stable codes without native details',async()=>{
  await assert.rejects(compressImageToTarget(new Blob(['PRIVATE'],{type:'image/png'}),1024),{code:'INVALID_IMAGE',stage:'opening'});
  const bytes=Uint8Array.from([255,216,255,192,0,17,8,0,1,0,1,3,1,17,0,2,17,0,3,17,0]);
  const old=globalThis.createImageBitmap;
  globalThis.createImageBitmap=async()=>{throw new DOMException('PRIVATE decoder details','InvalidStateError');};
  try {
    await assert.rejects(compressImageToTarget(new Blob([bytes],{type:'image/jpeg'}),1024),e=>{
      assert.equal(e.code,'DECODE_FAILED');
      assert.ok(!JSON.stringify(createDiagnostic(e,'conversion')).includes('PRIVATE'));
      return true;
    });
  }finally{globalThis.createImageBitmap=old;}
});

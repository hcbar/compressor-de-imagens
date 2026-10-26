"""Focused real-Canvas regressions for the two output intentions."""
import json
import os
from pathlib import Path


def run_format_cases(page):
    rows=page.evaluate('''async () => {
      const {compressImageToTarget:compress}=await import('/assets/image.js');
      const rows=[];window.__modeInputs={};
      for(const kind of ['alpha','text','detail','jpeg','webp']) {
        const c=document.createElement('canvas');c.width=600;c.height=450;const x=c.getContext('2d');
        if(kind==='alpha'){x.fillStyle='#176f56';x.fillRect(100,100,300,200);}
        else if(kind==='detail'){const d=x.createImageData(c.width,c.height);let seed=42;for(let i=0;i<d.data.length;i+=4){for(let k=0;k<3;k++){seed=(1664525*seed+1013904223)>>>0;d.data[i+k]=seed>>>24;}d.data[i+3]=255;}x.putImageData(d,0,0);}
        else{x.fillStyle='white';x.fillRect(0,0,c.width,c.height);x.fillStyle='black';x.font='35px sans-serif';x.fillText('Image Compressor 123 ABC',20,70);}
        const mime='image/'+(['jpeg','webp'].includes(kind)?kind:'png');
        const input=await new Promise(r=>c.toBlob(r,mime));if(input.type!==mime)throw Error('Fixture MIME');
        window.__modeInputs[kind]=input;
        for(const mode of ['smallest','original']) {
          const target=kind==='detail' && mode==='original'?1024:32768;
          const r=await compress(input,target,{mode});const bytes=new Uint8Array(await r.blob.arrayBuffer());
          const b=await createImageBitmap(r.blob);c.width=b.width;c.height=b.height;x.drawImage(b,0,0);b.close();const pixel=[...x.getImageData(0,0,1,1).data];
          if(r.reachedTarget!==(r.blob.size<=target))throw Error('Target mismatch');
          if(mode==='original' && r.blob.type!==mime)throw Error('Original MIME changed');
          if(kind==='alpha' && (!r.hasTransparency || pixel[3]!==0 || r.blob.type==='image/jpeg'))throw Error('Alpha lost');
          if(kind==='detail' && mode==='original' && r.reachedTarget)throw Error('Unreachable target unexpectedly reached');
          if(r.blob.type==='image/jpeg' && !(bytes[0]===255 && bytes[1]===216))throw Error('JPEG signature');
          if(r.blob.type==='image/png' && !(bytes[0]===137 && bytes[1]===80))throw Error('PNG signature');
          if(r.blob.type==='image/webp' && String.fromCharCode(...bytes.slice(8,12))!=='WEBP')throw Error('WebP signature');
          rows.push({kind,mode,inputMime:mime,outputMime:r.blob.type,inputBytes:input.size,outputBytes:r.blob.size,target,reached:r.reachedTarget,width:r.width,height:r.height});
        }
      }return rows;
    }''')
    def select_input(kind):
        page.evaluate('''kind=>{const d=new DataTransfer();d.items.add(new File([window.__modeInputs[kind]],'fixture',{type:window.__modeInputs[kind].type}));const input=document.querySelector('#file');input.files=d.files;input.dispatchEvent(new Event('change'));}''',kind)
    select_input('alpha')
    page.locator('#format').select_option('original')
    page.locator('#target').fill('100')
    page.locator('button[type=submit]').click()
    page.locator('#download').wait_for(state='visible',timeout=30000)
    assert 'Target reached' in page.locator('#result').inner_text()
    assert 'No size reduction' in page.locator('#result').inner_text()
    with page.expect_download() as info:page.locator('#download').click()
    assert info.value.suggested_filename.endswith('.png')
    assert Path(info.value.path()).read_bytes()[:8]==b'\x89PNG\r\n\x1a\n'
    select_input('detail')
    page.locator('#target').fill('1')
    page.locator('button[type=submit]').click()
    page.locator('#download').wait_for(state='visible',timeout=30000)
    assert 'Target not reached' in page.locator('#result').inner_text()
    page.locator('#format').select_option('smallest')
    assert page.locator('#download').is_hidden()
    page.evaluate('''() => {const original=window.createImageBitmap;window.createImageBitmap=(...a)=>new Promise((ok,bad)=>setTimeout(()=>original(...a).then(ok,bad),300));}''')
    page.locator('button[type=submit]').click()
    page.locator('#format').select_option('original')
    page.wait_for_function("() => !document.querySelector('button[type=submit]').disabled")
    assert page.locator('#download').is_hidden()
    assert page.locator('#status').inner_text()==''
    print('Two-mode matrix: '+json.dumps(rows),flush=True)


def run_locales(browser, host):
    labels={'en':['Smallest file (recommended)','Keep original format'],'pt':['Menor arquivo (recomendado)','Manter formato original'],'es':['Archivo más pequeño (recomendado)','Mantener formato original']}
    for lang,path in [('en','/'),('pt','/pt/'),('es','/es/')]:
        page=browser.new_page(viewport={'width':390,'height':844})
        page.goto(host+path)
        assert page.locator('#format option').all_text_contents()==labels[lang]
        assert page.locator('#format').input_value()=='smallest'
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        if lang=='pt' and os.getenv('SCREENSHOT_DIR'):page.screenshot(path=str(Path(os.environ['SCREENSHOT_DIR'])/'mobile-pt.png'),full_page=True)
        page.close()
    print('Two localized options and mobile layout OK: EN/PT/ES',flush=True)

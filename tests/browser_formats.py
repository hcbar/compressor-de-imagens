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
    # The user-facing product has no codec or mode selector; the automatic
    # codec choice is still verified independently by the matrix above.
    assert page.locator('#format').count()==0
    select_input('alpha')
    page.locator('#target').fill('100')
    page.locator('#preview-panel').wait_for(state='visible',timeout=30000)
    assert page.locator('#preview').get_attribute('src').startswith('blob:')
    with page.expect_download() as info:page.locator('#download').click()
    output = Path(info.value.path()).read_bytes()
    assert info.value.suggested_filename.endswith(('.png','.webp'))
    assert output[:8]==bytes([137,80,78,71,13,10,26,10]) or output[8:12]==b'WEBP'
    select_input('detail')
    assert page.locator('#preview-panel').is_hidden()
    page.locator('#target').fill('1')
    page.locator('#download').wait_for(state='visible',timeout=30000)
    assert '→' in page.locator('#result').inner_text()
    with page.expect_download() as tiny_download:
        page.locator('#download').click()
    assert len(Path(tiny_download.value.path()).read_bytes()) <= 1024, 'The requested 1 KB ceiling was not respected'
    print('Codec safety matrix and hard 1 KB maximum: '+json.dumps(rows),flush=True)


def run_locales(browser, host):
    labels={'en':'Result preview','pt':'Prévia do resultado','es':'Vista previa del resultado'}
    for lang,path in [('en','/'),('pt','/pt/'),('es','/es/')]:
        page=browser.new_page(viewport={'width':390,'height':844})
        page.goto(host+path)
        assert page.locator('html').get_attribute('lang').startswith(lang)
        assert page.locator('#format').count()==0
        assert page.locator('button[type=submit]').count()==0
        assert page.locator('#preview-panel').get_attribute('aria-label')==labels[lang]
        assert page.locator('#file').count()==1 and page.locator('#target').count()==1
        assert page.locator('#download').is_hidden()
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        if lang=='pt' and os.getenv('SCREENSHOT_DIR'):page.screenshot(path=str(Path(os.environ['SCREENSHOT_DIR'])/'mobile-pt.png'),full_page=True)
        page.close()
    print('Two inputs, automatic result and mobile layout OK: EN/PT/ES',flush=True)

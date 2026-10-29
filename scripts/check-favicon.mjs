import {readFileSync} from 'node:fs';
import {crc32,inflateSync} from 'node:zlib';

// Decode and validate ICO-embedded PNG data, not just the ICO header.
export function verifyFavicon(file) {
  const ico=readFileSync(file);
  if(ico.length<22||ico.readUInt16LE(0)!==0||ico.readUInt16LE(2)!==1)throw new Error('Invalid ICO header');
  const count=ico.readUInt16LE(4);
  if(count<1||ico.length<6+count*16)throw new Error('ICO image directory missing');
  for(let i=0;i<count;i++){
    const entry=6+i*16;
    const width=ico[entry]||256,height=ico[entry+1]||256;
    const size=ico.readUInt32LE(entry+8),start=ico.readUInt32LE(entry+12);
    if(start<6+count*16||size<45||start+size>ico.length)throw new Error('ICO image bounds invalid');
    const png=ico.subarray(start,start+size);
    if(!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('ICO must contain PNG');
    let pos=8,done=false,dimensions=false;
    const data=[];
    while(pos+12<=png.length){
      const length=png.readUInt32BE(pos),end=pos+12+length;
      if(end>png.length)throw new Error('Truncated PNG chunk');
      const type=png.toString('ascii',pos+4,pos+8);
      if(crc32(png.subarray(pos+4,pos+8+length))!==png.readUInt32BE(pos+8+length))throw new Error('PNG CRC mismatch');
      if(type==='IHDR'){
        if(length!==13||png.readUInt32BE(pos+8)!==width||png.readUInt32BE(pos+12)!==height||png[pos+16]!==8||png[pos+17]!==6)throw new Error('Unexpected PNG dimensions/format');
        dimensions=true;
      }
      if(type==='IDAT')data.push(png.subarray(pos+8,pos+8+length));
      pos=end;
      if(type==='IEND'){done=true;break;}
    }
    if(!done||!dimensions||pos!==png.length||!data.length)throw new Error('PNG structure incomplete');
    const decoded=inflateSync(Buffer.concat(data));
    if(decoded.length!==height*(1+width*4))throw new Error('PNG pixels incomplete');
  }
  return true;
}

import sys,wave,subprocess,json,re
from pocketsphinx import Decoder
wav,text,out=sys.argv[1],sys.argv[2],sys.argv[3]
subprocess.run(['ffmpeg','-loglevel','error','-y','-i',wav,'-ar','16000','-ac','1','/tmp/_a.wav'],check=True)
words=re.findall(r"[A-Za-z']+",text.lower())
d=Decoder(samprate=16000,bestpath=False)
EXTRA={'tiktoks':'T IH K T AA K S','tiktok':'T IH K T AA K','nootropic':'N UW T R AA P IH K','nootropics':'N UW T R AA P IH K S','theanine':'TH IY AH N IY N'}
for w in set(words):
  if d.lookup_word(w) is None:
    if w in EXTRA: d.add_word(w,EXTRA[w],False)
    else: print('MISSING',w)
d.set_align_text(' '.join(words))
w=wave.open('/tmp/_a.wav');d.start_utt();d.process_raw(w.readframes(w.getnframes()),full_utt=True);d.end_utt()
res=[(s.word,s.start_frame/100,(s.end_frame+1)/100) for s in d.seg() if s.word not in('<s>','</s>','<sil>')]
json.dump(res,open(out,'w'));print(len(words),len(res));print(res[:8],res[-3:])

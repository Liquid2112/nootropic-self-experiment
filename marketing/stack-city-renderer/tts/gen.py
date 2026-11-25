import json,sys,base64,subprocess,urllib.request,os
model,ep,txtfile=sys.argv[1:4]
key=open(os.environ.get("GEMINI_KEY_FILE",".gkey")).read().strip()
style=os.environ.get('STYLE','Fast, punchy, high-energy TikTok narrator, confident and playful, quick pace, big emphasis on capitalized words.')
text=open(txtfile).read().strip()
body={"contents":[{"parts":[{"text":f"{style}\n\n{text}"}]}],
 "generationConfig":{"responseModalities":["AUDIO"],"speechConfig":{"voiceConfig":{"prebuiltVoiceConfig":{"voiceName":"Puck"}}}}}
req=urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",data=json.dumps(body).encode(),headers={"Content-Type":"application/json","x-goog-api-key":key})
try: r=json.load(urllib.request.urlopen(req,timeout=180))
except urllib.error.HTTPError as e: print("ERR",e.code,e.read()[:400].decode()); sys.exit(1)
p=r["candidates"][0]["content"]["parts"][0]["inlineData"]
pcm=base64.b64decode(p["data"]); print(p.get("mimeType"),len(pcm))
open(f"/tmp/{ep}.pcm","wb").write(pcm)
out=os.path.join(os.path.dirname(__file__),'..','vo',f'{ep}.wav')
src=["-i",f"/tmp/{ep}.pcm"] if pcm[:4]==b"RIFF" else ["-f","s16le","-ar","24000","-ac","1","-i",f"/tmp/{ep}.pcm"]
subprocess.run(["ffmpeg","-y","-loglevel","error",*src,out],check=True)
print("wrote",out)

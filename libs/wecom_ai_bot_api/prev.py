# -*- coding: utf-8 -*-
import json
import time
import uuid
import xml.etree.ElementTree as ET
from urllib.parse import unquote
import hashlib
import traceback
from WXBizMsgCrypt3 import WXBizMsgCrypt
from quart import Quart, request, Response, jsonify

TOKEN            = ""
ENCODING_AES_KEY = ""
CORP_ID          = ""
RECEIVE_ID       = ""

app  = Quart(__name__)
wxcpt = WXBizMsgCrypt(TOKEN, ENCODING_AES_KEY, RECEIVE_ID)

def sha1_signature(token: str, timestamp: str, nonce: str, encrypt: str) -> str:
    raw = "".join(sorted([token, timestamp, nonce, encrypt]))
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()

@app.route("/", methods=["GET", "POST"])
async def wecom_url_verify():
    if request.method == "GET":
        msg_signature = unquote(request.args.get("msg_signature", ""))
        timestamp     = unquote(request.args.get("timestamp", ""))
        nonce         = unquote(request.args.get("nonce", ""))
        echostr       = unquote(request.args.get("echostr", ""))

        if not all([msg_signature, timestamp, nonce, echostr]):
            return Response("缺少参数", status=400)

        ret, decrypted_str = wxcpt.VerifyURL(msg_signature, timestamp, nonce, echostr)
        if ret != 0:
            return Response("验证失败", status=403)

        return Response(decrypted_str, mimetype="text/plain")

    elif request.method == "POST":
        msg_signature = unquote(request.args.get("msg_signature", ""))
        timestamp     = unquote(request.args.get("timestamp", ""))
        nonce         = unquote(request.args.get("nonce", ""))

        try:
            encrypted_json  = await request.get_json()
            encrypted_msg   = encrypted_json.get("encrypt", "")
            if not encrypted_msg:
                return Response("请求体中缺少 'encrypt' 字段", status=400)

            xml_post_data = f"<xml><Encrypt><![CDATA[{encrypted_msg}]]></Encrypt></xml>"
            ret, decrypted_xml = wxcpt.DecryptMsg(xml_post_data, msg_signature, timestamp, nonce)
            if ret != 0:
                return Response("解密失败", status=403)
            
            print("--- 解密后的消息 ---")
            print(decrypted_xml)

            msg_json = json.loads(decrypted_xml)
            from_user_id = msg_json.get("from", {}).get("userid")

            print("--- 收到解密消息 ---")
            print(f"来自用户: {from_user_id}")

            stream_id = str(uuid.uuid4())  # 流式消息唯一ID

            reply_plain = {
                "msgtype": "stream",
                "stream": {
                    "id": "1",
                    "finish": False,
                    "content": "你好"
                }
            }

            reply_plain_str = json.dumps(reply_plain, ensure_ascii=False)

            reply_timestamp = str(int(time.time()))
            ret, encrypt_text = wxcpt.EncryptMsg(reply_plain_str, nonce, reply_timestamp)
            if ret != 0:
                return Response("加密失败", status=500)
            
            # 解析出xml的encrypt字段

            root = ET.fromstring(encrypt_text)
            encrypt = root.find("Encrypt").text

            print("--- 解析出的加密消息 ---")
            print(encrypt)

            msgsig = sha1_signature(TOKEN, reply_timestamp, nonce, encrypt_text)
            resp = {
                "encrypt": encrypt,
                # "msgsignature": msgsig,
                # "timestamp": int(reply_timestamp),
                # "nonce": nonce
            }
            print(resp)
            return jsonify(resp), 200

        except Exception as e:
            traceback.print_exc()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=2291)

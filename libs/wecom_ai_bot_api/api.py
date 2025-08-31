import json
import time
import uuid
import xml.etree.ElementTree as ET
from urllib.parse import unquote
import hashlib
import traceback
from WXBizMsgCrypt3 import WXBizMsgCrypt
from quart import Quart, request, Response, jsonify
from pkg.platform.types import message as platform_message

class wecom_bot_client:
    def __init__(self,Token:str,EnCodingAESKey:str,Corpid:str,logger:None):
        self.Token=Token
        self.EnCodingAESKey=EnCodingAESKey
        self.Corpid=Corpid
        self.ReceiveId = ''
        self.app = Quart(__name__)
        self.app.add_url_rule(
            '/callback/command',
            'handle_callback',
            self.handle_callback_request,
            methods=['POST','GET']
        )
        self.user_stream_map = {}
        self.logger = logger

    async def sha1_signature(token: str, timestamp: str, nonce: str, encrypt: str) -> str:
        raw = "".join(sorted([token, timestamp, nonce, encrypt]))
        return hashlib.sha1(raw.encode("utf-8")).hexdigest()
    
    async def handle_callback_request(self):
        try:
            self.wxcpt=WXBizMsgCrypt(self.Token,self.EnCodingAESKey,self.Corpid)
            if request.method == "GET":
                msg_signature = unquote(request.args.get("msg_signature", ""))
                timestamp     = unquote(request.args.get("timestamp", ""))
                nonce         = unquote(request.args.get("nonce", ""))
                echostr       = unquote(request.args.get("echostr", ""))

                if not all([msg_signature, timestamp, nonce, echostr]):
                    self.logger.error("请求参数缺失")

                ret, decrypted_str = self.wxcpt.VerifyURL(msg_signature, timestamp, nonce, echostr)
                if ret != 0:
                    self.logger.error("验证URL失败")

                return Response(decrypted_str, mimetype="text/plain")

            elif request.method == "POST":
                msg_signature = unquote(request.args.get("msg_signature", ""))
                timestamp     = unquote(request.args.get("timestamp", ""))
                nonce         = unquote(request.args.get("nonce", ""))

                try:
                    encrypted_json  = await request.get_json()
                    encrypted_msg   = encrypted_json.get("encrypt", "")
                    if not encrypted_msg:
                        self.logger.error("请求体中缺少 'encrypt' 字段")

                    xml_post_data = f"<xml><Encrypt><![CDATA[{encrypted_msg}]]></Encrypt></xml>"
                    ret, decrypted_xml = self.wxcpt.DecryptMsg(xml_post_data, msg_signature, timestamp, nonce)
                    if ret != 0:
                        self.logger.error("解密失败")

                    msg_json = json.loads(decrypted_xml)
                    from_user_id = msg_json.get("from", {}).get("userid")

                    # 分配stream——id
                    if from_user_id in self.user_stream_map:
                        stream_id = self.user_stream_map[from_user_id]
                    else:
                        stream_id =str(uuid.uuid4())
                        self.user_stream_map[from_user_id] = stream_id

                    reply_plain = {
                        "msgtype": "stream",
                        "stream": {
                            "id": stream_id,
                            "finish": False,
                            "content": "你好"
                        }
                    }

                    reply_plain_str = json.dumps(reply_plain, ensure_ascii=False)

                    reply_timestamp = str(int(time.time()))
                    ret, encrypt_text = self.wxcpt.EncryptMsg(reply_plain_str, nonce, reply_timestamp)
                    if ret != 0:
                        self.logger.error("加密失败")
                    

                    root = ET.fromstring(encrypt_text)
                    encrypt = root.find("Encrypt").text
                    msgsig = self.sha1_signature(self.Token, reply_timestamp, nonce, encrypt_text)
                    resp = {
                        "encrypt": encrypt,
                    }
                    return jsonify(resp), 200

                except Exception as e:
                    self.logger.error(f"处理POST请求失败: {str(e)}")
                    self.logger.error(traceback.format_exc())

        except Exception as e:
            self.logger.error(f"处理请求失败: {str(e)}")
            self.logger.error(traceback.format_exc())
#!/usr/bin/env python3
"""Test SMS delivery either through the local Java service or Volcengine directly."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import hmac
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request


HOST = "sms.volcengineapi.com"
SERVICE = "volcSMS"
REGION = "cn-north-1"
ACTION = "SendSms"
VERSION = "2020-01-01"
ALGORITHM = "HMAC-SHA256"
CONTENT_TYPE = "application/json; charset=utf-8"


def required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(f"missing required environment variable: {name}")
    return value


def sha256_hex(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def hmac_sha256(key: bytes, value: str) -> bytes:
    return hmac.new(key, value.encode("utf-8"), hashlib.sha256).digest()


def quote(value: str) -> str:
    return urllib.parse.quote(value, safe="-_.~")


def canonical_query(params: dict[str, str]) -> str:
    return "&".join(f"{quote(key)}={quote(value)}" for key, value in sorted(params.items()))


def signing_key(secret_key: str, date: str) -> bytes:
    key_date = hmac_sha256(secret_key.encode("utf-8"), date)
    key_region = hmac_sha256(key_date, REGION)
    key_service = hmac_sha256(key_region, SERVICE)
    return hmac_sha256(key_service, "request")


def build_headers(access_key: str, secret_key: str, body: bytes, now: dt.datetime) -> tuple[dict[str, str], str]:
    x_date = now.strftime("%Y%m%dT%H%M%SZ")
    date = now.strftime("%Y%m%d")
    payload_hash = sha256_hex(body)
    headers_to_sign = {
        "content-type": CONTENT_TYPE,
        "host": HOST,
        "x-content-sha256": payload_hash,
        "x-date": x_date,
    }
    signed_headers = ";".join(headers_to_sign)
    canonical_headers = "".join(f"{key}:{value}\n" for key, value in headers_to_sign.items())
    query = canonical_query({"Action": ACTION, "Version": VERSION})
    canonical_request = "\n".join(
        ["POST", "/", query, canonical_headers, signed_headers, payload_hash]
    )
    credential_scope = f"{date}/{REGION}/{SERVICE}/request"
    string_to_sign = "\n".join(
        [ALGORITHM, x_date, credential_scope, sha256_hex(canonical_request.encode("utf-8"))]
    )
    signature = hmac.new(signing_key(secret_key, date), string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()
    authorization = (
        f"{ALGORITHM} Credential={access_key}/{credential_scope}, "
        f"SignedHeaders={signed_headers}, Signature={signature}"
    )
    return {
        "Content-Type": CONTENT_TYPE,
        "Host": HOST,
        "X-Content-Sha256": payload_hash,
        "X-Date": x_date,
        "Authorization": authorization,
    }, query


def call_java_service(base_url: str, phone: str) -> int:
    endpoint = base_url.rstrip("/") + "/api/v1/auth/sms/code"
    query = urllib.parse.urlencode({"phonenumber": phone})
    request = urllib.request.Request(f"{endpoint}?{query}", method="GET")

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            print(f"HTTP {response.status}")
            print(response.read().decode("utf-8"))
            return 0
    except urllib.error.HTTPError as error:
        print(f"HTTP {error.code}", file=sys.stderr)
        print(error.read().decode("utf-8"), file=sys.stderr)
    except urllib.error.URLError as error:
        print(f"request failed: {error.reason}", file=sys.stderr)
    return 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Test SMS delivery through the Java service or Volcengine")
    parser.add_argument("--phone", required=True, help="recipient mainland China mobile number")
    parser.add_argument(
        "--java-url",
        help="Java service base URL, for example http://127.0.0.1:8080; recommended",
    )
    parser.add_argument("--code", default=os.getenv("VOLC_SMS_CODE", "123456"), help="template code value")
    parser.add_argument(
        "--param-name",
        default=os.getenv("VOLC_SMS_TEMPLATE_PARAM_NAME", "code"),
        help="template variable name, for example code or content",
    )
    args = parser.parse_args()
    phone = args.phone.strip()
    if not re.fullmatch(r"1[3-9]\d{9}", phone):
        parser.error("--phone must be an 11-digit mainland China mobile number")

    if args.java_url:
        return call_java_service(args.java_url, phone)

    try:
        access_key = required("DALANSHU_VOLC_SMS_ACCESS_KEY")
        secret_key = required("DALANSHU_VOLC_SMS_SECRET_KEY")
        sms_account = required("DALANSHU_VOLC_SMS_ACCOUNT")
        sign = required("DALANSHU_VOLC_SMS_SIGN")
        template_id = required("DALANSHU_VOLC_SMS_REGISTER_TEMPLATE_ID")
    except ValueError as error:
        print(f"configuration error: {error}", file=sys.stderr)
        return 2

    payload = {
        "SmsAccount": sms_account,
        "Sign": sign,
        "TemplateID": template_id,
        "TemplateParam": json.dumps({args.param_name: args.code}, ensure_ascii=False, separators=(",", ":")),
        "PhoneNumbers": phone,
        "Tag": os.getenv("VOLC_SMS_TAG", "dalanshu-register"),
    }
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    headers, query = build_headers(access_key, secret_key, body, dt.datetime.now(dt.timezone.utc))
    request = urllib.request.Request(
        f"https://{HOST}/?{query}", data=body, headers=headers, method="POST"
    )

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            response_body = response.read().decode("utf-8")
            print(f"HTTP {response.status}")
            print(response_body)
            return 0
    except urllib.error.HTTPError as error:
        print(f"HTTP {error.code}", file=sys.stderr)
        print(error.read().decode("utf-8"), file=sys.stderr)
    except urllib.error.URLError as error:
        print(f"request failed: {error.reason}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

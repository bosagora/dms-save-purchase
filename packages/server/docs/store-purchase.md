# 구매내역을 저장

이 문서는 서버가 제공하는 엔드포인트에 대한 요청과 응답에 대한 속성들과 설명을 포함하고 있습니다.

## 1. URL

-   메인넷: https://store-purchase.kios.bosagora.org
-   테스트넷: https://store-purchase.kios.testnet.bosagora.org
-   개발넷: http://store-purchase.devnet.bosagora.org:3030

## 2. 거래를 저장하는 엔드포인트

#### - HTTP Request

`POST /v1/tx/purchase/new`

#### - HTTP Header

| 키               | 설명           |
|-----------------|--------------|
| Authorization   | 접근 비밀키       |

#### - 입력 파라메타들

| 파라메타명       |                 | 유형     | 필수 | 설명                                                          |
|-------------|-----------------|--------| ---- |-------------------------------------------------------------|
| purchaseId  |                 | string | Yes  | 구매 아이디                                                      |
| timestamp   |                 | string | Yes  | 타임스탬프                                                       |
| totalAmount |                 | number | Yes  | 구매 총금액 (소수점 포함, 1000원 -> 1000, 1.56USD -> 1.56)             |
| cashAmount  |                 | number | Yes  | 구매에 사용된 현금또는 카드결제  (소수점 포함, 1000원 -> 1000, 1.56USD -> 1.56) |
| currency    |                 | string | Yes  | 환률코드(usd, krw, the9, point...)                              |
| shopId      |                 | string | Yes  | 상점 아이디                                                      |
| userAccount |                 | string | Yes  | 마일리지가 적립될 사용자의 지갑주소                                         |
| userPhone   |                 | string | Yes  | 마일리지가 적립될 구매자의 전화번호,  국제표기법 +82 10-1000-2000 으로 해야 합니다.     |
| details     |                 | array  | Yes  | 상품별 상세내역, 이 항목은 배열입니다. 레코드는 반복됩니다.                          |
| details     | productId       | string | Yes  | 상품의 고유 아이디                                                  |
| details     | amount          | number | Yes  | 상품의 구매에 사용된 금액  (소수점 포함, 1000원 -> 1000, 1.56USD -> 1.56)    |
| details     | providePercent  | number | Yes  | 상품의 적립 퍼센트 (3.5% 이면 3.5)                                    |

#### - 입력 예시
```json
{
  "purchaseId": "913131705292050109",
  "timestamp": "1705292050",
  "totalAmount": 44400,
  "cashAmount": 44400,
  "currency": "krw",
  "shopId": "0x04ef11be936f49f6388dd20d062e43170fd7ce9e968e51426317e284b9309361",
  "userAccount": "0x89e3b2D91ecaf08016eEDb966c1fecA1e326714e",
  "userPhone": "",
  "details": [
    {
      "productId": "2020051310000674",
      "amount": 6600,
      "providePercent": 1.7
    },
    {
      "productId": "2020051310000124",
      "amount": 6300,
      "providePercent": 8.5
    },
    {
      "productId": "2020051310000997",
      "amount": 900,
      "providePercent": 5.7
    },
    {
      "productId": "2020051310000893",
      "amount": 15200,
      "providePercent": 4.2
    },
    {
      "productId": "2020051310000032",
      "amount": 6800,
      "providePercent": 1
    },
    {
      "productId": "2020051310000103",
      "amount": 8600,
      "providePercent": 5.7
    }
  ]
}
```

#### - 결과 

| 필드명1    | 필드명2          | 필드명3                 | 유형     | 필수 | 설명                                                   |
|---------|---------------|----------------------|--------| ---- |------------------------------------------------------|
| tx      | type          |                      | number | Yes  | 신규:0, 취소:1                                           |
| tx      | sequence      |                      | string | Yes  | 순번                                                   |
| tx      | purchaseId    |                      | string | Yes  | 구매 아이디                                               |
| tx      | timestamp     |                      | string | Yes  | 타임스탬프                                                |
| tx      | totalAmount   |                      | string | Yes  | 구매 총금액 (소수점이하 18자리로 표시된 문자, 소수점 포함하지 않음)             |
| tx      | cashAmount    |                      | string | Yes  | 구매에 사용된 현금또는 카드결제 (소수점이하 18자리로 표시된 문자, 소수점 포함하지 않음)  |
| tx      | currency      |                      | string | Yes  | 환률코드                                                 |
| tx      | shopId        |                      | string | Yes  | 상점 아이디                                               |
| tx      | userAccount   |                      | string | Yes  | 마일리지가 적립될 사용자의 지갑주소                                  |
| tx      | userPhoneHash |                      | string | Yes  | 마일리지가 적립될 구매자의 전화번호의 해시                              |
| tx      | signer        |                      | string | Yes  | 서명자의 지갑주소                                            |
| tx      | signature     |                      | string | Yes  | 서명                                                   |
| tx      | details       | productId            | string | Yes  | 상품의 고유 아이디                                           |
| tx      | details       | amount               | string | Yes  | 상품의 구매에 사용된 금액  (소수점이하 18자리로 표시된 문자, 소수점 포함하지 않음)    |
| tx      | details       | providePercent       | string | Yes  | 상품의 적립 퍼센트 (3.5% 이면 350)                             |
| loyalty | loyaltyValue  |                      | string | Yes  | 지급받을 예상 로열티(구매한 환률 단위)                               |
| loyalty | loyaltyPoint  |                      | string | Yes  | 지급받을 예상 로열티(포인트)                                     |
| loyalty | account       | accountType          | string | Yes  | 사용자의 계좌종류("address": 지갑주소, "phone": 전화번호 해시)         |
| loyalty | account       | account              | string | Yes  | 사용자의 계좌번호, 지갑주소 또는 전화번호 해시                           |
| loyalty | account       | loyaltyType          | number | Yes  | 사용자의 지갑의 로열티 종류 (0: 포인트, 1: 토큰)                      |
| loyalty | account       | currentBalance       | string | Yes  | 사용자의 현재 잔고                                           |
| loyalty | account       | loyaltyToBeProvided  | string | Yes  | 사용자에게 지급될 예상 로얄티(포인트 또는 토큰 으로 loyaltyType에 의해 결정된다)  |

```json
{
  "code": 0,
  "data": {
    "tx": {
      "type": 0,
      "sequence": "67",
      "purchaseId": "913131705292050109",
      "timestamp": "1705292050",
      "totalAmount": "44400000000000000000000",
      "cashAmount": "44400000000000000000000",
      "currency": "krw",
      "shopId": "0x04ef11be936f49f6388dd20d062e43170fd7ce9e968e51426317e284b9309361",
      "userAccount": "0x89e3b2D91ecaf08016eEDb966c1fecA1e326714e",
      "userPhoneHash": "0x32105b1d0b88ada155176b58ee08b45c31e4f2f7337475831982c313533b880c",
      "signer": "0xb9De33A8be2F913F6AFA3a64849c86F18410fF05",
      "signature": "0xaad9e24dbb0a54007f3d7ef5383bd14f3e7fd05dc80bcb0ceb83cf4a147f71fc2f59040b73e8f397be9ca81384be6b7390d3b587b99f5e93341df8200950da481b",
      "details": [
        {
          "productId": "2020051310000674",
          "amount": "6600000000000000000000",
          "providePercent": "170"
        },
        {
          "productId": "2020051310000124",
          "amount": "6300000000000000000000",
          "providePercent": "850"
        },
        {
          "productId": "2020051310000997",
          "amount": "900000000000000000000",
          "providePercent": "570"
        },
        {
          "productId": "2020051310000893",
          "amount": "15200000000000000000000",
          "providePercent": "420"
        },
        {
          "productId": "2020051310000032",
          "amount": "6800000000000000000000",
          "providePercent": "100"
        },
        {
          "productId": "2020051310000103",
          "amount": "8600000000000000000000",
          "providePercent": "570"
        }
      ]
    },
    "loyalty": {
      "loyaltyValue": "1895600000000000000000",
      "loyaltyPoint": "1895600000000000000000",
      "account": {
        "accountType": "address",
        "account": "0x89e3b2D91ecaf08016eEDb966c1fecA1e326714e",
        "loyaltyType": 0,
        "currentBalance": "7394300000000000000000",
        "loyaltyToBeProvided": "1895600000000000000000"
      }
    }
  }
}
```

---

## 3. 취소거래를 저장하는 엔드포인트

#### - HTTP Request

`POST /v1/tx/purchase/cancel`

#### - HTTP Header

| 키               | 설명           |
|-----------------|--------------|
| Authorization   | 접근 비밀키       |

#### - 입력 파라메타들

| 파라메타명       |                 | 유형     | 필수 | 설명         |
|-------------|-----------------|--------| ---- |------------|
| purchaseId  |                 | string | Yes  | 취소할 구매 아이디 |
| timestamp   |                 | string | Yes  | 타임스탬프      |

#### - 입력 예시
```json
{
  "purchaseId": "913131705292230377",
  "timestamp": "1705292240"
}
```

#### - 결과

| 필드명1    | 필드명2       | 필드명3 | 유형     | 필수 | 설명           |
|---------|------------|------|--------| ---- |--------------|
| tx      | type       |      | number | Yes  | 신규:0, 취소:1   |
| tx      | sequence   |      | string | Yes  | 순번           |
| tx      | purchaseId |      | string | Yes  | 구매 아이디       |
| tx      | timestamp  |      | string | Yes  | 타임스탬프        |
| tx      | signer     |      | string | Yes  | 서명자의 지갑주소    |
| tx      | signature  |      | string | Yes  | 서명           |

```json
{
  "code": 0,
  "data": {
    "tx": {
      "type": 1,
      "sequence": "77",
      "purchaseId": "913131705292230377",
      "timestamp": "1705292240",
      "signer": "0xb9De33A8be2F913F6AFA3a64849c86F18410fF05",
      "signature": "0x485483456ea17639053e9e89beea80f5f7cb909b12a05dcd41b24ba715481d3c7c5153bb4b036e4affbd6679aa41ad481bf33074347a6010a60d647acb00fdf61b"
    }
  }
}
```

---

## 4. 응답 코드와 메세지

| 코드   | 메세지                                                                                              |
|------|--------------------------------------------------------------------------------------------------|
| 0000 | 성공<br/>Success                                                                                   |
| 2001 | 파라메타의 검증에 실패하였습니다<br/>Failed to check the validity of parameters                                 |
| 2002 | 지갑주소가 유효하지 않습니다<br/>This is not a wallet address                                                 |
| 2003 | 전화번호가 유효하지 않습니다<br/>This is not a phone number format. International Standard (+82 10-1000-2000) |
| 2004 | 구매총금액과 상세구매내역의 총합이 일치하지 않습니다<br/>totalAmount and sum of detailed purchase do not match           |
| 3051 | 엑세스키가 유효하지 않습니다<br/>The access key entered is not valid                                          |

[상단으로 이동](#로열티를-사용한-결제-프로세스)

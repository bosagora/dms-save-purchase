# 구매내역을 저장

이 문서는 서버가 제공하는 엔드포인트에 대한 요청과 응답에 대한 속성들과 설명을 포함하고 있습니다.

## 1. URL

-   메인넷: https://store-purchase.kios.bosagora.org
-   테스트넷: https://store-purchase.kios.testnet.bosagora.org
-   개발넷: http://store-purchase.devnet.bosagora.org:3030

## 2. 거래를 저장하는 엔드포인트

#### - HTTP Request

`POST /v1/tx/purchase/new`

#### - 입력 파라메타들

| 파라메타명       |                 | 유형     | 필수 | 설명                                                          |
|-------------|-----------------|--------| ---- |-------------------------------------------------------------|
| accessKey   |                 | string | Yes  | 접근키                                                         |
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
  "purchaseId": "913131703230316517",
  "timestamp": "1703230316",
  "totalAmount": 51400,
  "cashAmount": 51400,
  "currency": "krw",
  "shopId": "0x08bde9ef98803841f22e8bc577a69fc47913914a8f5fa60e016aaa74bc86dd47",
  "userAccount": "0xdCdb0368728F93c3a7aAef38980B5f0933cCcF31",
  "userPhone": "",
  "details": [
    {
      "productId": "PD000915",
      "amount": 1900,
      "providePercent": 6.4
    },
    {
      "productId": "PD000167",
      "amount": 6400,
      "providePercent": 7.7
    },
    {
      "productId": "PD000578",
      "amount": 10400,
      "providePercent": 5.2
    },
    {
      "productId": "PD000665",
      "amount": 6400,
      "providePercent": 2.9
    },
    {
      "productId": "PD000750",
      "amount": 1300,
      "providePercent": 0
    },
    {
      "productId": "PD000929",
      "amount": 3800,
      "providePercent": 9.2
    },
    {
      "productId": "PD000680",
      "amount": 7600,
      "providePercent": 0.1
    },
    {
      "productId": "PD000864",
      "amount": 5500,
      "providePercent": 7.5
    },
    {
      "productId": "PD000596",
      "amount": 8100,
      "providePercent": 9.4
    }
  ]
}
```

#### - 결과 
```json
{
  "code": 0,
  "data": {
    "type": 0,
    "sequence": "45",
    "purchaseId": "913131703230316517",
    "timestamp": "1703230316",
    "totalAmount": "51400000000000000000000",
    "cashAmount": "51400000000000000000000",
    "currency": "krw",
    "shopId": "0x08bde9ef98803841f22e8bc577a69fc47913914a8f5fa60e016aaa74bc86dd47",
    "userAccount": "0xdCdb0368728F93c3a7aAef38980B5f0933cCcF31",
    "userPhoneHash": "0x32105b1d0b88ada155176b58ee08b45c31e4f2f7337475831982c313533b880c",
    "signer": "0x9f97e74e211D53B16491f33a1fF3A6E774B6Af26",
    "signature": "0xfd9ec4d89be8264a0142fb9d77087036f9a0b940c1220d419c3637a4810b32347abe7b767223e5f4345a6bbf3af4c49bd1cdaaa61ecc14472f862d02b7d5becd1c",
    "details": [
      {
        "productId": "PD000915",
        "amount": "1900000000000000000000",
        "providePercent": "640"
      },
      {
        "productId": "PD000167",
        "amount": "6400000000000000000000",
        "providePercent": "770"
      },
      {
        "productId": "PD000578",
        "amount": "10400000000000000000000",
        "providePercent": "520"
      },
      {
        "productId": "PD000665",
        "amount": "6400000000000000000000",
        "providePercent": "290"
      },
      {
        "productId": "PD000750",
        "amount": "1300000000000000000000",
        "providePercent": "0"
      },
      {
        "productId": "PD000929",
        "amount": "3800000000000000000000",
        "providePercent": "919"
      },
      {
        "productId": "PD000680",
        "amount": "7600000000000000000000",
        "providePercent": "10"
      },
      {
        "productId": "PD000864",
        "amount": "5500000000000000000000",
        "providePercent": "750"
      },
      {
        "productId": "PD000596",
        "amount": "8100000000000000000000",
        "providePercent": "940"
      }
    ]
  }
}
```

---

## 3. 취소거래를 저장하는 엔드포인트

#### - HTTP Request

`POST /v1/tx/purchase/cancel`

#### - 입력 파라메타들

| 파라메타명       |                 | 유형     | 필수 | 설명         |
|-------------|-----------------|--------| ---- |------------|
| accessKey   |                 | string | Yes  | 접근키        |
| purchaseId  |                 | string | Yes  | 취소할 구매 아이디 |
| timestamp   |                 | string | Yes  | 타임스탬프      |

#### - 입력 예시
```json
{
  "purchaseId": "913131703230316517",
  "timestamp": 1703230316,
  "totalAmount": 51400,
}
```

#### - 결과
```json
{
  "code": 0,
  "data": {
    "type": 1,
    "sequence": "50",
    "purchaseId": "913131703230316517",
    "timestamp": "1703230316",
    "signer": "0x9f97e74e211D53B16491f33a1fF3A6E774B6Af26",
    "signature": "0xfd9ec4d89be8264a0142fb9d77087036f9a0b940c1220d419c3637a4810b32347abe7b767223e5f4345a6bbf3af4c49bd1cdaaa61ecc14472f862d02b7d5becd1c",
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

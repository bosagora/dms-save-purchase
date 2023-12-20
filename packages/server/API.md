# API User's Guide

이 문서는 서버가 제공하는 엔드포인트에 대한 요청과 응답에 대한 속성들과 설명을 포함하고 있습니다.

## 1. Endpoint `/tx/record`

블록체인에 저장할 트랜잭션을 입력하는 엔드포인트입니다.

-   ### Method : `POST`

-   ### Request

    -   sequence : 트랜잭션의 순번
    -   trade_id : 거래아이디
    -   user_id : 고객키
    -   state : 거래구분 ("0": Charge, "1": Discharge)
    -   amount : 거래금액
    -   timestamp : 거래발생시각 (UNIX EPOCH)
    -   exchange_user_id : 고객 해시코드
    -   exchange_id : 거래소 구분키
    -   signer : 서명자의 이더리움주소
    -   signature : 서명

    입력필드를 생성하는 데 필요한 설명은 아래 문서를 참조해 주세요  
    https://github.com/bosagora/rollup-sdk-csharp/blob/v0.x.x/README.md

-   ### Response
    -   `code` :
        -   200 : 정상일 때 이 값을 리턴합니다. 트랜잭션을 성공적으로 접수했을 때 전달됩니다
        -   400 : 입력필드 오류
        -   417 : 잘못된 트랜잭션의 순번
        -   500 : 서비스 오류
    -   `data` : code 의 값이 200 이면 "SUCCESS" 를 리턴합니다. 그렇지 않으면 이 속성은 존재하지 않습니다.
    -   `error` : code 의 값이 200 이 아닐 때만 이 속성이 존재합니다.
        -   code 가 400 일 때 error 의 속성들
            -   param : 오류가 발생한 입력필드
            -   msg : 오류메세지
        -   code 가 417 일 때 error 의 속성들
            -   param: "sequence"
            -   expected: 서버에서 수신되어야 할 예상 순번
            -   actual: 클라이언트가 전송한 트랜잭션의 순번
            -   msg: "sequence is different from the expected value"
        -   code 가 500 일 때 error 의 속성들
            -   msg : 오류 메세지

## 2. Endpoint `/tx/sequence`

가장 마지막에 수신한 트랜잭션의 순번을 제공하는 엔드포인트 입니다

-   ### Method : `GET`

-   ### Request

-   ### Response
    -   `code` :
        -   200 : 정상일 때 이 값을 리턴합니다. 트랜잭션을 성공적으로 접수했을 때 전달됩니다
        -   500 : 서비스 오류
    -   `data` : code 의 값이 200일 때 data 의 속성들
        -   sequence : 가장 마직막에 수신한 트랜잭션 순번
    -   `error` : code 의 값이 200이 아닐 때만 이 속성이 존재합니다.
        -   code 가 500 일 때 error 의 속성들
            -   msg : 오류 메세지

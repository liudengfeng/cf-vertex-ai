// 构造一个正常的 Response 实例，状态码为 200
const successResponse = new Response(JSON.stringify({
    status: 'success',
    statusCode: 200,
    message: 'OK'
}), {
    status: 200,
    statusText: 'OK',
    headers: {
        'Content-Type': 'application/json'
    }
});

// 构造一个异常的 Response 实例，状态码为 500
const errorResponse = new Response(JSON.stringify({
    status: 'error',
    statusCode: 500,
    message: 'Internal Server Error'
}), {
    status: 500,
    statusText: 'Internal Server Error',
    headers: {
        'Content-Type': 'application/json'
    }
});

// 输出正常 Response 实例的属性
console.log('Success Response ok:', successResponse.ok); // 应该输出 true
console.log('Success Response status:', successResponse.status); // 应该输出 200
console.log('Success Response statusText:', successResponse.statusText); // 应该输出 'OK'

// 输出正常 Response 实例的 body 内容
// successResponse.json().then(data => {
//     console.log('Success Response body:', data);
// });

// 输出异常 Response 实例的属性
console.log('Error Response ok:', errorResponse.ok); // 应该输出 false
console.log('Error Response status:', errorResponse.status); // 应该输出 500
console.log('Error Response statusText:', errorResponse.statusText); // 应该输出 'Internal Server Error'

// // 输出异常 Response 实例的 body 内容
// errorResponse.json().then(data => {
//     console.log('Error Response body:', data);
// });
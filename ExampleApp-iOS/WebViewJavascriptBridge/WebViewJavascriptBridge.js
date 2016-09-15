;(function() {
	if (window.WebViewJavascriptBridge) { return }
	var messagingIframe
	var sendMessageQueue = []
	var receiveMessageQueue = []
	var messageHandlers = {}
	
	var MESSAGE_SEPARATOR = '__WVJB_MESSAGE_SEPERATOR__'
	var CUSTOM_PROTOCOL_SCHEME = 'wvjbscheme'
	var QUEUE_HAS_MESSAGE = '__WVJB_QUEUE_MESSAGE__'
	
	var responseCallbacks = {}
	var uniqueId = 1
	
  //创建iframe 隐藏 用于发送自定义格式的协议CUSTOM_PROTOCOL_SCHEME + '://' + QUEUE_HAS_MESSAGE
  //这是能实现交互的核心 触发UIWebView的shouldStartLoadWithRequest回调协议
	function _createQueueReadyIframe(doc) {
		messagingIframe = doc.createElement('iframe')
		messagingIframe.style.display = 'none'
		doc.documentElement.appendChild(messagingIframe)
	}

  //初始化方法，初始化默认的消息处理器
  //从消息队列中取出消息 并发送消息
	function init(messageHandler) {
		if (WebViewJavascriptBridge._messageHandler) { throw new Error('WebViewJavascriptBridge.init called twice') }
		WebViewJavascriptBridge._messageHandler = messageHandler
		var receivedMessages = receiveMessageQueue
		receiveMessageQueue = null
  //发送消息
		for (var i=0; i<receivedMessages.length; i++) {
			_dispatchMessageFromObjC(receivedMessages[i])
		}
	}

  //发送消息并设置回调
	function send(data, responseCallback) {
		_doSend({ data:data }, responseCallback)
	}
	
  //注册消息处理器
	function registerHandler(handlerName, handler) {
		messageHandlers[handlerName] = handler
	}
	
  //调用处理器并设置回调
	function callHandler(handlerName, data, responseCallback) {
		_doSend({ handlerName:handlerName, data:data }, responseCallback)
	}
	
  //内部方法 消息发送
	function _doSend(message, responseCallback) {
		if (responseCallback) {
  //为回调对象产生唯一标识
			var callbackId = 'cb_'+(uniqueId++)+'_'+new Date().getTime()
  //并存储到一个集合对象里
			responseCallbacks[callbackId] = responseCallback
			message['callbackId'] = callbackId
		}
		sendMessageQueue.push(JSON.stringify(message))
		messagingIframe.src = CUSTOM_PROTOCOL_SCHEME + '://' + QUEUE_HAS_MESSAGE
	}

  //获得队列，将队列中的每个元素用分隔符分隔之后连成一个字符串【native端调用】
	function _fetchQueue() {
		var messageQueueString = sendMessageQueue.join(MESSAGE_SEPARATOR)
		sendMessageQueue = []
		return messageQueueString
	}

  //内部方法:处理来自objc的消息
	function _dispatchMessageFromObjC(messageJSON) {
		setTimeout(function _timeoutDispatchMessageFromObjC() {
			var message = JSON.parse(messageJSON)
			var messageHandler
			
			if (message.responseId) {
                //取出回调函数对象并执行
				var responseCallback = responseCallbacks[message.responseId]
				if (!responseCallback) { return; }
				responseCallback(message.responseData)
				delete responseCallbacks[message.responseId]
			} else {
				var responseCallback
				if (message.callbackId) {
					var callbackResponseId = message.callbackId
					responseCallback = function(responseData) {
						_doSend({ responseId:callbackResponseId, responseData:responseData })
					}
				}
				
				var handler = WebViewJavascriptBridge._messageHandler
                
                //如果消息中已包含消息处理器，则使用该处理器；否则使用默认处理器
				if (message.handlerName) {
					handler = messageHandlers[message.handlerName]
				}
				
				try {
					handler(message.data, responseCallback)
				} catch(exception) {
					if (typeof console != 'undefined') {
						console.log("WebViewJavascriptBridge: WARNING: javascript handler threw.", message, exception)
					}
				}
			}
		})
	}
	
  //处理来自ObjC的消息
	function _handleMessageFromObjC(messageJSON) {
  //如果接收队列对象存在则入队该消息，否则直接处理
		if (receiveMessageQueue) {
			receiveMessageQueue.push(messageJSON)
		} else {
			_dispatchMessageFromObjC(messageJSON)
		}
	}

	window.WebViewJavascriptBridge = {
		init: init,
		send: send,
		registerHandler: registerHandler,
		callHandler: callHandler,
		_fetchQueue: _fetchQueue,
		_handleMessageFromObjC: _handleMessageFromObjC
	}

	var doc = document
	_createQueueReadyIframe(doc)
  //自定义事件 需要在Html中监听该事件
	var readyEvent = doc.createEvent('Events')
	readyEvent.initEvent('WebViewJavascriptBridgeReady')
	readyEvent.bridge = WebViewJavascriptBridge
	doc.dispatchEvent(readyEvent)
})();

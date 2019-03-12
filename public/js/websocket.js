//
// This web interface has been quickly thrown together. It's not production code.
//

websocket = {
    setupErrorCount: 0,
    volume: {channels: 0, data: [] },
}

websocket.setup = function() {
    var hostAndPort = window.location.host
    var protocol = window.location.protocol == 'http:' ? 'ws:' : 'wss:'
    var websocketUrl = protocol + '//' + hostAndPort + '/socket'
    websocket.socket = new WebSocket(websocketUrl)
    websocket.socket.addEventListener('open', websocket._onSocketOpen)
    websocket.socket.addEventListener('error', websocket._onSocketError);
    websocket.socket.addEventListener('message', websocket._onMessageReceived);
    websocket.socket.addEventListener('close', websocket._onSocketClose);
}

websocket._onSocketOpen = event => {
    websocket.setupErrorCount = 0
}

websocket._onSocketError = event => {
    websocket.setupErrorCount++
}

websocket._onSocketClose = event => {
    console.log('Websocket closed, reconnecting...')
    var NUM_RETRY_ATTEMPTS = 10
    if (websocket.setupErrorCount < NUM_RETRY_ATTEMPTS) {
        console.error("Websocket error, now happened " + websocket.setupErrorCount + ' times')
        app.alertMsg = 'Server connection lost, retrying...'
        window.setTimeout(websocket.setup, 1000 + (1000 * websocket.setupErrorCount));
    }
    else {
        console.error("Websocket error, now happened " + websocket.setupErrorCount + ' times, not attempting again.')
        app.alertMsg = 'Unable to connect to server, please refresh the page'
    }
}

websocket._onMessageReceived = event => {
    dataParsed = JSON.parse(event.data)
    if (dataParsed.msg_type === 'ping') {
        if (dataParsed.cpu_percent) {
            websocket._setCpuPercent(dataParsed.cpu_percent)
        }
        return
    }
    else if (dataParsed.msg_type === 'update') {
        websocket._handleUpdate(dataParsed.data)
    }
    else if (dataParsed.msg_type === 'delete') {
        websocket._handleDelete(dataParsed.data)
    }
    else if (dataParsed.msg_type === 'webrtc-initialising') {
        if (dataParsed.ice_servers) webrtc.setIceServers(dataParsed.ice_servers)
    }
    else if (dataParsed.msg_type === 'volume') {
        websocket.volume.channels = dataParsed.channels;
        websocket.volume.data = dataParsed.data;
    }
    else if (dataParsed.sdp != null) {
        webrtc.onIncomingSDP(dataParsed.sdp);
    } else if (dataParsed.ice != null) {
        webrtc.onIncomingICE(dataParsed.ice);
    } else {
        console.warning("Unexpected websocket message:", dataParsed);
    }
}

websocket._getHandlerForBlockType = function(t) {
    switch(t) {
        case 'input':
            return inputsHandler
        case 'output':
            return outputsHandler
        case 'mixer':
            return mixersHandler
        case 'overlay':
            return overlaysHandler
    }

    console.error('Unknown block type', t)
}

websocket._handleUpdate = function(block) {
    websocket._handleDelete(block)
    app.blocks.push(block)
}

websocket._handleDelete = function(block) {
    // Done in a way that Vue can handle:
    for (let i=app.blocks.length-1; i>=0; i--) {
        if (block.uid === app.blocks[i].uid) Vue.delete(app.blocks, i)   
    }
}

websocket._setCpuPercent = (num) => {
    app.cpu = 'CPU usage: ' + num + '%'
}

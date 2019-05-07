import * as React from 'react'
import { observer, inject } from 'mobx-react'
import { observable, action, toJS, computed } from 'mobx'
import { Button, AutoComplete, Popconfirm, Modal, Input, message } from 'antd'
import ReactJson, { InteractionProps } from 'react-json-view'

import * as styles from './index.scss'
import { LOCALSTORAGE_KEYS } from '@constants/index'
import { DATA_FORMATS } from '@constants/socket'
import { send } from '@services/websocket'

interface IStoreProps {
    isSocketIO?: boolean
    socketIsConnected?: boolean
    setSocketType?: (type: ISocketStore.SocketType) => void
    dataFormat?: ISocketStore.DataFormatType
}

const localSocketIOEvents = localStorage.getItem(LOCALSTORAGE_KEYS.SOCKET_IO_EVENTS)
let initialLocalSocketIOEvents: string[] = localSocketIOEvents ? JSON.parse(localSocketIOEvents) : []
if (initialLocalSocketIOEvents.length > 30) {
    initialLocalSocketIOEvents = initialLocalSocketIOEvents.slice(0, 30)
}
// 处理空数据(修复bug)
const initialSocketIOEvents: string[] = []
for (const e of initialLocalSocketIOEvents) {
    if (e) {
        initialSocketIOEvents.push(e)
    }
}

@inject(
    (store: IStore): IStoreProps => {
        const { socketIsConnected, isSocketIO, setSocketType, dataFormat } = store.socketStore
        return { socketIsConnected, isSocketIO, setSocketType, dataFormat }
    }
)
@observer
class Send extends React.Component<IStoreProps> {
    @observable
    private content: string = ''
    @observable
    private textContent: string = ''
    @observable.ref
    private jsonContent: PlainObject = {}
    @observable
    private socketIOEvent: string = ''
    @observable
    private socketIOEvents: string[] = initialSocketIOEvents
    @observable
    private modalVisible: boolean = false

    @computed
    get canSend() {
        const { socketIsConnected, isSocketIO } = this.props
        if (isSocketIO && !this.socketIOEvent) {
            return false
        }
        return socketIsConnected
    }

    @computed
    get sendingContent() {
        const { dataFormat } = this.props
        if (dataFormat === DATA_FORMATS[0]) {
            return this.jsonContent
        }
        return this.textContent
    }

    @action
    toggleModalVisible = () => {
        this.modalVisible = !this.modalVisible
    }

    @action
    handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        this.content = e.target.value
    }

    @action
    handleTextContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        this.textContent = e.target.value
    }

    @action
    handleOK = () => {
        try {
            const jsonContent = JSON.parse(this.content)
            this.jsonContent = jsonContent
            this.toggleModalVisible()
        } catch (err) {
            console.error(err)
            message.destroy()
            message.error('请输入json格式的字符串!!!')
        }
    }

    @action
    handleReactJsonChange = (e: InteractionProps) => {
        this.jsonContent = e.updated_src
    }

    @action
    reset = () => {
        this.jsonContent = {}
    }

    @action
    handleSocketEventChange = (e: string) => {
        this.socketIOEvent = e
    }

    @action
    handleSubmit = () => {
        if (!this.props.isSocketIO) {
            return send(null, this.sendingContent)
        } else if (!this.socketIOEvent) {
            message.destroy()
            return message.error('请输入事件名称!!!')
        }
        if (!this.socketIOEvents.includes(this.socketIOEvent)) {
            this.socketIOEvents.unshift(this.socketIOEvent)
            localStorage.setItem(LOCALSTORAGE_KEYS.SOCKET_IO_EVENTS, JSON.stringify(this.socketIOEvents))
        }
        send(this.socketIOEvent, this.sendingContent)
    }

    render() {
        const { isSocketIO, dataFormat } = this.props
        return (
            <div>
                {isSocketIO && (
                    <AutoComplete
                        className={styles.autoComplete}
                        dataSource={toJS(this.socketIOEvents)}
                        placeholder="输入事件名称"
                        value={this.socketIOEvent}
                        onChange={this.handleSocketEventChange}
                        filterOption={(inputValue, option) =>
                            (option.props.children as string).toUpperCase().includes(inputValue.toUpperCase())
                        }
                    />
                )}
                {dataFormat === DATA_FORMATS[0] ? (
                    <div className={styles.content}>
                        <div className={styles.reset}>
                            <Popconfirm placement="topLeft" title="确认重置为空?" onConfirm={this.reset}>
                                <Button>重置为空</Button>
                            </Popconfirm>
                            <Button className={styles.btnCover} type="primary" onClick={this.toggleModalVisible}>
                                自定义覆盖
                            </Button>
                            <Modal
                                title="定义值"
                                style={{ top: 20 }}
                                visible={this.modalVisible}
                                onOk={this.handleOK}
                                onCancel={this.toggleModalVisible}
                            >
                                <Input.TextArea
                                    placeholder="请输入json格式的字符串"
                                    autosize={{ minRows: 4, maxRows: 10 }}
                                    value={this.content}
                                    onChange={this.handleContentChange}
                                />
                            </Modal>
                        </div>
                        <ReactJson
                            name={false}
                            theme="monokai"
                            style={{
                                padding: 10,
                                minHeight: 150,
                                maxHeight: 500,
                                overflow: 'auto',
                                borderRadius: 3,
                                wordWrap: 'break-word',
                                wordBreak: 'break-all'
                            }}
                            onAdd={this.handleReactJsonChange}
                            onEdit={this.handleReactJsonChange}
                            onDelete={this.handleReactJsonChange}
                            src={this.jsonContent}
                        />
                    </div>
                ) : (
                    <Input.TextArea
                        className={styles.textContent}
                        placeholder="请输入传输内容"
                        autosize={{ minRows: 4, maxRows: 10 }}
                        value={this.textContent}
                        onChange={this.handleTextContentChange}
                    />
                )}

                <Button block size="large" disabled={!this.canSend} type="primary" onClick={this.handleSubmit}>
                    发送
                </Button>
            </div>
        )
    }
}

export default Send

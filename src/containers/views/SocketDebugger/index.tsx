import * as React from 'react'

import * as styles from './index.scss'
import Handler from './Handler'
import Browse from './Browse'

function SocketDebugger() {
    return (
        <div className={styles.home}>
            <Handler />
            <Browse />
        </div>
    )
}

export default SocketDebugger

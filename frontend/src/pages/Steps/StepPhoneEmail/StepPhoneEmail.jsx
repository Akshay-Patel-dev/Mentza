import React, { useState } from 'react';
import Phone from './Phone/Phone';
import Email from './Email/Email';
import styles from './StepPhoneEmail.module.css';

const phoneEmailMap = {
    email: Email,
    phone: Phone,
};

const StepPhoneEmail = ({ onNext }) => {
    const [type, setType] = useState('email');
    const Component = phoneEmailMap[type];

    return (
        <>
            <div className={styles.cardWrapper}>
                <div>
                    <div className={styles.buttonWrap}>
                        <button
                            className={`${styles.tabButton} ${
                                type === 'email' ? styles.active : ''
                            }`}
                            onClick={() => setType('email')}
                        >
                            <img src="/images/mail-white.png" alt="email" />
                        </button>
                        <button
                            className={`${styles.tabButton} ${
                                type === 'phone' ? styles.active : ''
                            }`}
                            onClick={() => setType('phone')}
                        >
                            <img src="/images/phone-white.png" alt="phone" />
                        </button> 
                    </div>
                    <Component onNext={onNext} />
                </div>
            </div>
        </>
    );
};

export default StepPhoneEmail;

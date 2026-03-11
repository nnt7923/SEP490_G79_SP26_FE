import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../services/Axios'

interface QuizStatusBadgeProps {
    quizId: string
}

const QuizStatusBadge: React.FC<QuizStatusBadgeProps> = ({ quizId }) => {
    const { t } = useTranslation('student')
    const [status, setStatus] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let isMounted = true
        api.get(`/quizzes/${quizId}/status`)
            .then((res: any) => {
                if (isMounted) {
                    setStatus(res.status || 'NotStarted')
                    setLoading(false)
                }
            })
            .catch((err) => {
                console.error('Failed to fetch quiz status', err)
                if (isMounted) {
                    setStatus('NotStarted')
                    setLoading(false)
                }
            })
        return () => { isMounted = false }
    }, [quizId])

    if (loading) {
        return (
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-disabled)', marginLeft: 8 }}>
                {t('quizStatus.loading', { defaultValue: '[ ... ]' })}
            </span>
        )
    }

    // Define styles based on terminal theme
    let color = 'var(--text-secondary)'
    let text = t('quizStatus.NotStarted', { defaultValue: '[ NOT STARTED ]' })

    switch (status) {
        case 'InProgress':
            color = 'var(--warning-primary)'
            text = t('quizStatus.InProgress', { defaultValue: '[ IN PROGRESS ]' })
            break
        case 'Passed':
            color = 'var(--success-primary)'
            text = t('quizStatus.Passed', { defaultValue: '[ PASSED ]' })
            break
        case 'NotPassed':
            color = 'var(--danger-primary)'
            text = t('quizStatus.NotPassed', { defaultValue: '[ NOT PASSED ]' })
            break
        case 'NotStarted':
        default:
            color = 'var(--text-disabled)'
            text = t('quizStatus.NotStarted', { defaultValue: '[ NOT STARTED ]' })
            break
    }

    return (
        <span style={{
            fontSize: 11,
            fontFamily: 'monospace',
            color: color,
            marginLeft: 8,
            fontWeight: 600,
            letterSpacing: 0.5
        }}>
            {text}
        </span>
    )
}

export default QuizStatusBadge

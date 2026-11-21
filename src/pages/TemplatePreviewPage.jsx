import React, { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { resolveTemplateDef, TemplateDoc } from '../templates/registry'
import { useData } from '../store/data'
import { useBuilder } from '../store/builder'
import { Button, Badge } from '../components/ui'
import { makeSampleInvoice } from './TemplatesGalleryPage'
import { toast } from '../store/ui'

const SCALE = 0.85

export default function TemplatePreviewPage() {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const data = useData()
  const b = useBuilder()
  const def = useMemo(() => resolveTemplateDef(templateId, data.customTemplates), [templateId, data.customTemplates])
  const sample = useMemo(() => makeSampleInvoice(data.settings), [data.settings])

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 lg:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{def.name}</h1>
          <p className="text-sm text-slate-500">{def.description}</p>
        </div>
        <div className="flex gap-2">
          <Badge>{def.isCustom ? 'My Templates' : def.category}</Badge>
          <Button variant="secondary" onClick={() => navigate('/templates')}>← Gallery</Button>
          <Button
            onClick={() => {
              if (def.isCustom) b.patch({ templateId: def.id, customization: def.customRef.customization || null })
              else b.patch({ templateId: def.id, customization: null })
              b.save()
              toast(`${def.name} applied`, 'success')
              navigate(`/builder/${b.invoice?.id || ''}`)
            }}
          >
            Use this template
          </Button>
        </div>
      </header>
      <div className="overflow-x-auto rounded-2xl bg-slate-100 p-6 dark:bg-slate-900">
        <div className="mx-auto w-fit shadow-2xl" style={{ transform: `scale(${SCALE})`, transformOrigin: 'top left', height: 'fit-content' }}>
          <TemplateDoc def={def} invoice={sample} />
        </div>
      </div>
    </div>
  )
}

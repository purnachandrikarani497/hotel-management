import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

import { useToast } from "@/hooks/use-toast"

type Props = {
  types: string[]
  onAddType: (type: string) => void
  onRemoveType?: (type: string) => void
}

const RoomTypeManager: React.FC<Props> = ({ types, onAddType, onRemoveType }) => {
  const [newType, setNewType] = React.useState("")
  const { toast } = useToast()

  const add = () => {
    if (newType === "") {
      toast({ title: "Please enter the Create Room Type", variant: "destructive" })
      return
    }
    const t = newType.trim()
    if (!t) {
      toast({ title: "Missing Create Room Type", variant: "destructive" })
      return
    }
    if (t.length === 1) {
      toast({ title: "Create Room Type cannot be a single character", variant: "destructive" })
      return
    }
    onAddType(t)
    setNewType("")
  }

  return (
    <div className="rounded-lg border p-3 bg-card">
      <div className="text-sm font-medium mb-2">Create Room Type</div>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Input 
            placeholder="Type name" 
            value={newType} 
            onChange={e => {
              const val = e.target.value
              if (val.length > 50) {
                toast({ title: "Maximum limit exceeded", variant: "destructive" })
                return
              }
              if (!/^[a-zA-Z\s]*$/.test(val)) {
                toast({ title: "Invalid Create Room Type", variant: "destructive" })
                return
              }
              setNewType(val)
            }} 
          />
        </div>
        <Button onClick={add}>Add</Button>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">Available Types</div>
      <div className="mt-2 flex gap-2 flex-wrap">
        {Array.from(new Set(types)).map(t => (
          <div key={t} className="px-2 py-1 bg-secondary rounded text-xs flex items-center gap-2">
            <span>{t}</span>
            {onRemoveType && (
              <Button size="sm" variant="outline" className="h-6" onClick={()=>onRemoveType(t)}>Remove</Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default RoomTypeManager
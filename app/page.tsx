import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Tablero Deportivo</CardTitle>
          <CardDescription>Sistema de registro de resultados en tiempo real</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/control" className="block">
            <Button className="w-full h-12 text-lg" size="lg">
              Panel de Control
            </Button>
          </Link>
          <Link href="/display" className="block">
            <Button variant="outline" className="w-full h-12 text-lg bg-transparent" size="lg">
              Pantalla Pública
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

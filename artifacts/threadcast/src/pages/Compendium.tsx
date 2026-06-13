import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WaterAffinityReference } from "@/components/compendium/WaterAffinityReference";

export default function Compendium() {
  return (
    <div className="container mx-auto max-w-5xl py-8 px-4">
      <h1 className="text-3xl font-[family-name:'Cinzel',serif] text-foreground mb-8">Compendium</h1>
      
      <Tabs defaultValue="water" className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-12 mb-6">
          <TabsTrigger value="core" className="font-[family-name:'Cinzel',serif] rounded-none data-[state=active]:bg-muted data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary h-full px-6">Core Rules</TabsTrigger>
          <TabsTrigger value="water" className="font-[family-name:'Cinzel',serif] rounded-none data-[state=active]:bg-muted data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary h-full px-6">Water Affinity</TabsTrigger>
        </TabsList>

        <TabsContent value="core" className="font-mono text-muted-foreground space-y-4">
          <div className="border border-border p-6 bg-card">
            <h2 className="text-xl font-[family-name:'Cinzel',serif] text-primary mb-4">Core Mechanics</h2>
            <p className="mb-4">Roll a d20 and add the relevant modifier. Compare to the DC.</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Harmony:</strong> Roll 2d20, take the higher result.</li>
              <li><strong>Discord:</strong> Roll 2d20, take the lower result.</li>
              <li><strong>Thread Break (Nat 20):</strong> Critical success. The weave responds violently in your favor.</li>
              <li><strong>Misfire (Nat 1):</strong> Critical failure. A snapback occurs.</li>
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="water">
          <WaterAffinityReference />
        </TabsContent>
      </Tabs>
    </div>
  );
}

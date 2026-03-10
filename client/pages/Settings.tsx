import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/contexts/SessionContext";
import {
  LLMConfig,
  configStore,
  createLLMProvider,
  DEFAULT_MODELS,
  DiscoveredModel,
} from "@/lib/llm-service";
import { Loader, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const { sessionId, isLoadingSession } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [validationStatus, setValidationStatus] = useState<
    "idle" | "valid" | "invalid"
  >("idle");
  const [discoveredModels, setDiscoveredModels] = useState<DiscoveredModel[]>(
    []
  );

  const [config, setConfig] = useState<LLMConfig>({
    apiKey: "",
    apiUrl: "",
    model: "gpt-4-turbo",
    temperature: 0.7,
    maxTokens: 2000,
  });

  // Load saved config on mount
  useEffect(() => {
    if (isLoadingSession) return;

    const loadConfig = async () => {
      // First try to load from server
      if (sessionId) {
        try {
          const response = await fetch(`/api/sessions/${sessionId}/config`);
          if (response.ok) {
            const serverConfig = await response.json();
            // Server config doesn't have apiKey (security), so we need apiKey from localStorage
            const localConfig = configStore.load();
            setConfig({
              apiKey: localConfig?.apiKey || "",
              apiUrl: serverConfig.apiUrl || "",
              model: serverConfig.model || "gpt-4-turbo",
              temperature: localConfig?.temperature || 0.7,
              maxTokens: localConfig?.maxTokens || 2000,
            });
            setValidationStatus("valid");
            return;
          }
        } catch (error) {
          console.error("Error loading server config:", error);
        }
      }

      // Fallback to localStorage
      const saved = configStore.load();
      if (saved) {
        setConfig(saved);
        setValidationStatus("valid");
      }
    };

    loadConfig();
  }, [sessionId, isLoadingSession]);

  const availableModels = discoveredModels.length > 0 ? discoveredModels : DEFAULT_MODELS.map((id) => ({ id }));

  const handleApiUrlChange = (apiUrl: string) => {
    setConfig({ ...config, apiUrl });
    setValidationStatus("idle");
    setDiscoveredModels([]);
  };

  const handleModelChange = (model: string) => {
    setConfig({ ...config, model });
    setValidationStatus("idle");
  };

  const handleApiKeyChange = (apiKey: string) => {
    setConfig({ ...config, apiKey });
    setValidationStatus("idle");
    setDiscoveredModels([]);
  };

  const handleTemperatureChange = (temp: string) => {
    const temperature = parseFloat(temp) || 0.7;
    setConfig({ ...config, temperature: Math.max(0, Math.min(2, temperature)) });
  };

  const handleMaxTokensChange = (tokens: string) => {
    const maxTokens = parseInt(tokens) || 2000;
    setConfig({ ...config, maxTokens: Math.max(100, maxTokens) });
  };

  const handleTestConnection = async () => {
    if (!config.apiKey) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch("/api/llm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user" as const, content: "test" }],
          model: config.model || "gpt-4-turbo",
          temperature: 0.7,
          max_tokens: 100,
          apiKey: config.apiKey,
          apiUrl: config.apiUrl,
        }),
      });

      if (response.ok) {
        setValidationStatus("valid");
        toast({
          title: "Success",
          description: "Connection verified!",
        });

        // Auto-discover models on successful connection
        await handleDiscoverModels();
      } else {
        const errorData = await response.json();
        const errorMsg = errorData.message || "Connection failed";
        setValidationStatus("invalid");
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
        console.error("Test connection error:", errorData);
      }
    } catch (error) {
      setValidationStatus("invalid");
      const errorMsg =
        error instanceof Error ? error.message : "Connection failed";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
      console.error("Test connection error:", error);
    } finally {
      setIsTesting(false);
    }
  };

  const handleDiscoverModels = async () => {
    if (!config.apiKey) {
      toast({
        title: "Error",
        description: "Please enter an API key first",
        variant: "destructive",
      });
      return;
    }

    setIsDiscovering(true);
    try {
      const provider = createLLMProvider(config);
      const models = await provider.discoverModels();

      if (models && models.length > 0) {
        setDiscoveredModels(models);
        // Set first discovered model as selected if not already set
        if (!config.model || discoveredModels.length === 0) {
          setConfig({ ...config, model: models[0].id });
        }
        toast({
          title: "Success",
          description: `Found ${models.length} available models`,
        });
      } else {
        setDiscoveredModels([]);
        toast({
          title: "Info",
          description: "No chat models found. Using default models.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Model discovery error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to discover models",
        variant: "destructive",
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleSave = async () => {
    if (!config.apiKey) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }

    if (validationStatus !== "valid") {
      toast({
        title: "Error",
        description: "Please test your connection first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Save to server if sessionId is available
      if (sessionId) {
        const response = await fetch(`/api/sessions/${sessionId}/config`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            apiKey: config.apiKey,
            apiUrl: config.apiUrl || undefined,
            model: config.model,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to save to server");
        }
      }

      // Also save locally for other fields (temperature, maxTokens)
      configStore.save(config);

      toast({
        title: "Success",
        description: "Configuration saved successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save configuration",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear all settings?")) {
      configStore.clear();
      setConfig({
        apiKey: "",
        apiUrl: "",
        model: "gpt-4-turbo",
        temperature: 0.7,
        maxTokens: 2000,
      });
      setValidationStatus("idle");
      setDiscoveredModels([]);
      toast({
        title: "Cleared",
        description: "All settings have been cleared",
      });
    }
  };

  const providerName = config.apiUrl
    ? new URL(config.apiUrl).hostname || "Custom Provider"
    : "OpenAI";

  return (
    <Layout>
      <div className="flex flex-col h-full bg-background dark:bg-background">
        {/* Header */}
        <div className="border-b border-border dark:border-border px-6 py-6">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-bold text-foreground dark:text-foreground">
              Settings
            </h1>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
              Configure your OpenAI-compatible API provider
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl space-y-6">
            {/* Provider Configuration */}
            <div className="bg-card dark:bg-card border border-border dark:border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-foreground dark:text-foreground mb-4">
                Provider Configuration
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground dark:text-foreground block mb-2">
                    API Key
                  </label>
                  <div className="relative">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={config.apiKey}
                      onChange={(e) => handleApiKeyChange(e.target.value)}
                      placeholder="Enter your API key (sk-...)"
                      className="pr-10 bg-background dark:bg-background border-border dark:border-border text-foreground dark:text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-2">
                    Your API key is stored securely in your browser and never shared.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground dark:text-foreground block mb-2">
                    API Endpoint URL (Optional)
                  </label>
                  <Input
                    type="text"
                    value={config.apiUrl}
                    onChange={(e) => handleApiUrlChange(e.target.value)}
                    placeholder="Leave empty for OpenAI or https://api.z.ai/api/coding/paas/v4"
                    className="bg-background dark:bg-background border-border dark:border-border text-foreground dark:text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-2">
                    <strong>Z.ai:</strong> Use https://api.z.ai/api/coding/paas/v4 with models like <code className="bg-muted px-1 rounded">glm-4.7</code>, <code className="bg-muted px-1 rounded">glm-4.5-flash</code>.
                    Leave empty for OpenAI with models like <code className="bg-muted px-1 rounded">gpt-4-turbo</code>
                  </p>
                </div>
              </div>
            </div>

            {/* Model Selection */}
            <div className="bg-card dark:bg-card border border-border dark:border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-foreground dark:text-foreground mb-4">
                Model Selection
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground dark:text-foreground block mb-2">
                    Model
                  </label>
                  <div className="flex gap-2">
                    <Select value={config.model} onValueChange={handleModelChange}>
                      <SelectTrigger className="flex-1 bg-background dark:bg-background border-border dark:border-border text-foreground dark:text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card dark:bg-card border-border dark:border-border">
                        {availableModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleDiscoverModels}
                      disabled={!config.apiKey || isDiscovering}
                      variant="outline"
                      className="whitespace-nowrap"
                    >
                      {isDiscovering ? (
                        <>
                          <Loader className="w-4 h-4 mr-2 animate-spin" />
                          Discovering...
                        </>
                      ) : (
                        "Discover"
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-2">
                    {discoveredModels.length > 0
                      ? `${discoveredModels.length} models available from ${providerName}`
                      : `Using default models. Click "Discover" to find available models.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Model Parameters */}
            <div className="bg-card dark:bg-card border border-border dark:border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-foreground dark:text-foreground mb-4">
                Model Parameters
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground dark:text-foreground block mb-2">
                    Temperature ({config.temperature.toFixed(2)})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={config.temperature}
                    onChange={(e) => handleTemperatureChange(e.target.value)}
                    className="w-full cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                    Lower = more deterministic, Higher = more creative
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground dark:text-foreground block mb-2">
                    Max Tokens
                  </label>
                  <Input
                    type="number"
                    value={config.maxTokens}
                    onChange={(e) => handleMaxTokensChange(e.target.value)}
                    min="100"
                    step="100"
                    className="bg-background dark:bg-background border-border dark:border-border text-foreground dark:text-foreground"
                  />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                    Maximum response length
                  </p>
                </div>
              </div>
            </div>

            {/* Connection Status */}
            {validationStatus !== "idle" && (
              <div
                className={`rounded-lg p-4 flex items-center gap-3 ${
                  validationStatus === "valid"
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : "bg-red-500/10 text-red-700 dark:text-red-400"
                }`}
              >
                {validationStatus === "valid" ? (
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                )}
                <span className="text-sm font-medium">
                  {validationStatus === "valid"
                    ? "Connection verified"
                    : "Connection failed"}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleTestConnection}
                disabled={!config.apiKey || isTesting}
                variant="outline"
                className="flex-1"
              >
                {isTesting ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>

              <Button
                onClick={handleSave}
                disabled={!config.apiKey || isLoading || validationStatus !== "valid"}
                className="flex-1 bg-primary dark:bg-primary hover:opacity-90 text-primary-foreground dark:text-primary-foreground"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Configuration"
                )}
              </Button>

              <Button
                onClick={handleClear}
                variant="destructive"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

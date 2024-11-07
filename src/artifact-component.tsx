import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';

const ResourceCalculator = () => {
  const [inputs, setInputs] = useState({
    requestsPerSecond: 100,
    p90RequestTime: 500,
    dynoCores: 8,
    pumaWorkers: 8,
    pumaThreads: 5,
    workerDynos: 1,
    activeRecordPoolSize: 16,
    redisPoolSize: 5,
    actualWebDynos: null, // This will be set to recommended by default
  });

  const [results, setResults] = useState({
    recommendedWebDynos: 0,
    maxRequestsPerDyno: 0,
    totalDbConnections: 0,
    webDbConnections: 0,
    workerDbConnections: 0,
    redisConnections: 0,
    webRedisConnections: 0,
    workerRedisConnections: 0,
    actualCapacity: 0,
    capacityUtilization: 0,
    safetyFactor: 0.5,
  });

  const calculateResources = () => {
    const threadsPerDyno = inputs.pumaWorkers * inputs.pumaThreads;
    const requestsPerThread = (1000 / inputs.p90RequestTime);
    const maxRequestsPerDyno = threadsPerDyno * requestsPerThread * results.safetyFactor;
    const recommendedWebDynos = Math.ceil(inputs.requestsPerSecond / maxRequestsPerDyno);
    
    // Use actual dynos if set, otherwise use recommended
    const webDynos = inputs.actualWebDynos || recommendedWebDynos;
    
    // Calculate DB connections
    const webDbConnections = webDynos * Math.min(
      inputs.pumaWorkers * inputs.pumaThreads,
      inputs.activeRecordPoolSize
    );
    const workerDbConnections = inputs.workerDynos * inputs.activeRecordPoolSize;
    
    // Calculate Redis connections
    // Web dynos typically need fewer Redis connections than workers
    const webRedisConnections = webDynos * 3; // Typical baseline for web processes
    const workerRedisConnections = inputs.workerDynos * inputs.redisPoolSize;
    
    // Calculate capacity and utilization
    const actualCapacity = maxRequestsPerDyno * webDynos;
    const capacityUtilization = (inputs.requestsPerSecond / actualCapacity) * 100;
    
    setResults({
      ...results,
      recommendedWebDynos,
      maxRequestsPerDyno: Math.round(maxRequestsPerDyno * 100) / 100,
      totalDbConnections: webDbConnections + workerDbConnections,
      webDbConnections,
      workerDbConnections,
      redisConnections: webRedisConnections + workerRedisConnections,
      webRedisConnections,
      workerRedisConnections,
      actualCapacity: Math.round(actualCapacity * 100) / 100,
      capacityUtilization: Math.round(capacityUtilization * 100) / 100,
    });
  };

  useEffect(() => {
    calculateResources();
  }, [inputs]);

  const handleInputChange = (name: string, value: string | number): void => {
    setInputs(prev => ({
      ...prev,
      [name]: Number(value)
    }));
  };

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Requests per second</Label>
                <p className="text-sm text-gray-500 mb-2">
                  Average number of HTTP requests your application receives per second
                </p>
                <Input 
                  type="number" 
                  value={inputs.requestsPerSecond}
                  onChange={(e) => handleInputChange('requestsPerSecond', e.target.value)}
                  min="1"
                />
              </div>
              
              <div>
                <Label>P90 request time (ms)</Label>
                <p className="text-sm text-gray-500 mb-2">
                  90th percentile of your request processing time - 90% of requests complete faster than this value
                </p>
                <Input 
                  type="number" 
                  value={inputs.p90RequestTime}
                  onChange={(e) => handleInputChange('p90RequestTime', e.target.value)}
                  min="1"
                />
              </div>

              <div>
                <Label>CPU cores per dyno</Label>
                <p className="text-sm text-gray-500 mb-2">
                  Number of CPU cores available on your dyno type (e.g., 8 for Performance-L)
                </p>
                <Input 
                  type="number" 
                  value={inputs.dynoCores}
                  onChange={(e) => handleInputChange('dynoCores', e.target.value)}
                  min="1"
                />
              </div>

              <div>
                <Label>Puma workers per dyno</Label>
                <p className="text-sm text-gray-500 mb-2">
                  Number of Puma worker processes per dyno. Set via WEB_CONCURRENCY
                </p>
                <Input 
                  type="number" 
                  value={inputs.pumaWorkers}
                  onChange={(e) => handleInputChange('pumaWorkers', e.target.value)}
                  min="1"
                />
              </div>

              <div>
                <Label>Puma threads per worker</Label>
                <p className="text-sm text-gray-500 mb-2">
                  Number of threads per Puma worker. Set via RAILS_MAX_THREADS
                </p>
                <Input 
                  type="number" 
                  value={inputs.pumaThreads}
                  onChange={(e) => handleInputChange('pumaThreads', e.target.value)}
                  min="1"
                />
              </div>

              <div>
                <Label>Worker dynos</Label>
                <p className="text-sm text-gray-500 mb-2">
                  Number of background job processing dynos (affects total DB connections)
                </p>
                <Input 
                  type="number" 
                  value={inputs.workerDynos}
                  onChange={(e) => handleInputChange('workerDynos', e.target.value)}
                  min="0"
                />
              </div>

              <div>
                <Label>ActiveRecord pool size</Label>
                <p className="text-sm text-gray-500 mb-2">
                  Maximum database connections per process. Should match RAILS_MAX_THREADS
                </p>
                <Input 
                  type="number" 
                  value={inputs.activeRecordPoolSize}
                  onChange={(e) => handleInputChange('activeRecordPoolSize', e.target.value)}
                  min="1"
                />
              </div>

              <div>
                <Label>Redis pool size</Label>
                <p className="text-sm text-gray-500 mb-2">
                  Maximum Redis connections per Sidekiq worker process. Set in Sidekiq config
                </p>
                <Input 
                  type="number" 
                  value={inputs.redisPoolSize}
                  onChange={(e) => handleInputChange('redisPoolSize', e.target.value)}
                  min="1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="sm:sticky sm:top-4 h-fit">
          <CardHeader>
            <CardTitle>Required Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="bg-blue-50 p-6 rounded-lg">
                <Label className="text-xl font-bold">Recommended Web Dynos: {results.recommendedWebDynos}</Label>
                <div className="mt-4">
                  <Label>Adjust web dynos</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[inputs.actualWebDynos || results.recommendedWebDynos]}
                      onValueChange={([value]) => handleInputChange('actualWebDynos', value)}
                      min={1}
                      max={Math.max(results.recommendedWebDynos * 2, 10)}
                      step={1}
                      className="flex-grow"
                    />
                    <span className="text-lg font-bold min-w-[3ch]">
                      {inputs.actualWebDynos || results.recommendedWebDynos}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between text-sm text-gray-500">
                    <span>Utilization: {results.capacityUtilization}%</span>
                    <span>Capacity: {results.actualCapacity} req/s</span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-lg font-bold">Per Dyno Capacity</Label>
                <p className="text-xl">{results.maxRequestsPerDyno} requests/second</p>
                <p className="text-sm text-gray-500">
                  Each dyno can handle this many requests per second at 50% capacity
                </p>
              </div>

              <div>
                <Label className="text-lg font-bold">Database Connections</Label>
                <p className="text-xl">{results.totalDbConnections} total</p>
                <p className="text-sm text-gray-500">
                  Web: {results.webDbConnections} | Workers: {results.workerDbConnections}
                </p>
              </div>

              <div>
                <Label className="text-lg font-bold">Redis Connections</Label>
                <p className="text-xl">{results.redisConnections} total</p>
                <p className="text-sm text-gray-500">
                  Web: {results.webRedisConnections} | Workers: {results.workerRedisConnections}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <Label className="text-lg font-bold">Environment Variables</Label>
                <div className="mt-2 font-mono text-sm">
                  <p>WEB_CONCURRENCY={inputs.pumaWorkers}</p>
                  <p>RAILS_MAX_THREADS={inputs.pumaThreads}</p>
                  <p className="text-gray-500 mt-2">Add these to your Heroku config vars</p>
                </div>
              </div>

              {inputs.pumaWorkers > inputs.dynoCores && (
                <Alert>
                  <AlertDescription>
                    You have more Puma workers ({inputs.pumaWorkers}) than CPU cores ({inputs.dynoCores}). This may lead to CPU contention.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResourceCalculator;
